import os
import zipfile
import tarfile
import shutil
import tempfile
import asyncio
from pathlib import Path
from services.batch_manager import bm
from models.schema import Job
from services.pdf_parser import process_pdfs
from logger_config import get_logger
from sqlalchemy import select

logger = get_logger(__name__)

_pdf_processing_semaphore = asyncio.Semaphore(1)


async def process_archive(job_id: str, archive_path: str, batch_year: int):
    await _pdf_processing_semaphore.acquire()
    logger.info(
        f"Starting process_archive background task for job {job_id}, batch {batch_year}"
    )

    # 1. Update status to processing
    async with bm.session_scope(batch_year) as session:
        result = await session.execute(select(Job).where(Job.id == job_id))
        job = result.scalars().first()
        if job:
            job.status = "processing"
            job.progress = 0
            await session.commit()

    temp_dir = tempfile.mkdtemp(prefix="acatrack_pdf_")
    flat_pdf_dir = os.path.join(temp_dir, "pdfs")
    os.makedirs(flat_pdf_dir, exist_ok=True)

    try:
        # 2. Extract files
        ext = Path(archive_path).suffix.lower()
        if ext == ".zip":
            with zipfile.ZipFile(archive_path, "r") as ref:
                ref.extractall(temp_dir)
        elif ext in (".tar", ".gz", ".tgz"):
            with tarfile.open(archive_path, "r:*") as ref:
                ref.extractall(temp_dir)
        elif ext == ".rar":
            try:
                import rarfile

                with rarfile.RarFile(archive_path) as ref:
                    ref.extractall(temp_dir)
            except Exception as e:
                raise RuntimeError(
                    f"RAR extraction failed or rarfile library not configured: {e}"
                )
        else:
            raise ValueError(f"Unsupported archive format: {ext}")

        # 3. Locate all PDFs recursively and move them to flat_pdf_dir
        pdf_paths = []
        for root, _, files in os.walk(temp_dir):
            if root == flat_pdf_dir:
                continue
            for file in files:
                if file.lower().endswith(".pdf"):
                    src = os.path.join(root, file)
                    dst = os.path.join(flat_pdf_dir, file)
                    # Handle duplicate filenames in archive if any
                    counter = 1
                    base_name, suffix = os.path.splitext(file)
                    while os.path.exists(dst):
                        dst = os.path.join(
                            flat_pdf_dir, f"{base_name}_{counter}{suffix}"
                        )
                        counter += 1
                    shutil.move(src, dst)
                    pdf_paths.append(dst)

        total_files = len(pdf_paths)
        logger.info(f"Found {total_files} PDF files to process in archive.")

        if total_files == 0:
            raise ValueError("No PDF files found in the uploaded archive.")

        # Update job progress and total list of files
        file_names = [os.path.basename(p) for p in pdf_paths]
        async with bm.session_scope(batch_year) as session:
            result = await session.execute(select(Job).where(Job.id == job_id))
            job = result.scalars().first()
            if job:
                job.processed_files = file_names
                await session.commit()

        # 4. Call pdf_parser.process_pdfs to process the flat directory
        excel_filename = f"result_list_{batch_year}.xlsx"
        supabase_folder = str(batch_year) if batch_year else "2023"

        # Check if existing Excel exists in Supabase to perform incremental updates
        from utils.cloud import excel_exists_in_supabase, download_excel_from_supabase
        from database import demo_session_var

        session_id = demo_session_var.get()

        local_temp_path = Path(tempfile.gettempdir()) / excel_filename

        # Remove stale local temp file if it exists
        if local_temp_path.exists():
            try:
                local_temp_path.unlink()
            except Exception:
                pass

        try:
            if excel_exists_in_supabase(excel_filename, supabase_folder):
                logger.info(
                    "Existing consolidated Excel found in Supabase. Downloading for incremental update..."
                )
                downloaded_path = download_excel_from_supabase(
                    excel_filename, supabase_folder, session_id
                )
                shutil.move(downloaded_path, local_temp_path)
        except Exception as e:
            logger.warning(
                f"Failed to fetch existing Excel from Supabase (non-fatal): {e}"
            )

        import asyncio

        loop = asyncio.get_event_loop()

        def progress_callback(current, total):
            async def update_db():
                try:
                    async with bm.session_scope(batch_year) as session:
                        result = await session.execute(
                            select(Job).where(Job.id == job_id)
                        )
                        job = result.scalars().first()
                        if job:
                            job.progress = current
                            await session.commit()
                            logger.info(
                                f"🔄 Progress updated in database: {current} / {total} PDFs done"
                            )
                except Exception as db_err:
                    logger.error(f"❌ Failed to update job progress in DB: {db_err}")

            asyncio.run_coroutine_threadsafe(update_db(), loop)

        import time

        parse_start_time = time.time()

        result = await loop.run_in_executor(
            None,
            process_pdfs,
            excel_filename,
            flat_pdf_dir,
            supabase_folder,
            progress_callback,
            True,  # parse_only=True
        )

        parsed_rows = []
        if isinstance(result, tuple) and len(result) == 3:
            _, parse_duration, parsed_rows = result
        else:
            parse_duration = time.time() - parse_start_time

        logger.info(
            f"🎉 PDF-to-Excel parser completed in {parse_duration:.2f} seconds ({parse_duration / 60:.2f} minutes) for all PDFs!"
        )

        # --- RESILIENT DB SYNC & FALLBACK ---
        # Proactively load the parsed data directly from memory into PostgreSQL
        ingestion_duration = 0.0
        if parsed_rows:
            try:
                from services.data_prep import convert_in_memory_rows_to_postgres

                logger.info(
                    "🔄 Resilient DB Sync: Proactively importing parsed results to Postgres (In-Memory)..."
                )
                ingest_start = time.perf_counter()
                await loop.run_in_executor(
                    None, convert_in_memory_rows_to_postgres, parsed_rows, batch_year
                )
                ingestion_duration = time.perf_counter() - ingest_start
                logger.info(
                    "✅ Resilient DB Sync: Postgres database updated successfully!"
                )
            except Exception as db_err:
                logger.error(f"❌ Resilient DB Sync failed: {db_err}", exc_info=True)
        else:
            logger.warning("⚠️ No parsed rows found for database synchronization.")

        # 5. Success - mark Job as done in Postgres immediately so student gets their grades instantly!
        async with bm.session_scope(batch_year) as session:
            result_job = await session.execute(select(Job).where(Job.id == job_id))
            job = result_job.scalars().first()
            if job:
                job.status = "done"
                job.progress = 100
                job.meta = {
                    "parse_duration": parse_duration,
                    "ingestion_duration": ingestion_duration,
                }
                await session.commit()

        logger.info(f"Job {job_id} database sync completed successfully!")

        # 6. Launch out-of-band Excel compilation and Supabase upload
        asyncio.create_task(
            build_excel_and_upload_async(
                excel_filename,
                temp_dir,
                flat_pdf_dir,
                supabase_folder,
                batch_year,
                job_id,
                archive_path,
                parsed_rows,
            )
        )
        # Release semaphore early as main workload is finished
        _pdf_processing_semaphore.release()
        return

    except Exception as e:
        logger.error(f"Error processing archive for job {job_id}: {e}", exc_info=True)
        async with bm.session_scope(batch_year) as session:
            result = await session.execute(select(Job).where(Job.id == job_id))
            job = result.scalars().first()
            if job:
                job.status = "failed"
                job.error = str(e)
                await session.commit()
        # Clean up temp files immediately on failure
        _pdf_processing_semaphore.release()
        try:
            shutil.rmtree(temp_dir)
            if os.path.exists(archive_path):
                os.remove(archive_path)
        except Exception as err:
            logger.warning(f"Failed to clean up temp files on job failure: {err}")


async def build_excel_and_upload_async(
    excel_filename,
    temp_dir,
    flat_pdf_dir,
    supabase_folder,
    batch_year,
    job_id,
    archive_path,
    parsed_rows,
):
    try:
        logger.info(f"📁 Starting out-of-band Excel compilation for Job {job_id}...")
        loop = asyncio.get_running_loop()
        # Call process_pdfs with parse_only=False to compile and upload Excel
        result = await loop.run_in_executor(
            None,
            process_pdfs,
            excel_filename,
            flat_pdf_dir,
            supabase_folder,
            None,
            False,  # parse_only=False
            parsed_rows,
        )
        excel_url = result[0] if isinstance(result, tuple) else result

        # Save excel_url to the completed job record
        if excel_url:
            async with bm.session_scope(batch_year) as session:
                result_job = await session.execute(select(Job).where(Job.id == job_id))
                job = result_job.scalars().first()
                if job:
                    job.excel_url = excel_url
                    await session.commit()
            logger.info(
                f"✅ Out-of-band Excel compilation completed successfully for Job {job_id}! URL: {excel_url}"
            )
    except Exception as e:
        logger.error(
            f"❌ Out-of-band Excel compilation failed for Job {job_id}: {e}",
            exc_info=True,
        )
    finally:
        # Clean up temporary directory and uploaded zip file after Excel compilation is done
        try:
            shutil.rmtree(temp_dir)
            if os.path.exists(archive_path):
                os.remove(archive_path)
            logger.debug(f"🧹 Temporary files cleaned up for Job {job_id}.")
        except Exception as err:
            logger.warning(f"Failed to clean up temp files for Job {job_id}: {err}")
