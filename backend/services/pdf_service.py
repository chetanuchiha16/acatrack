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
    logger.info(f"Starting process_archive background task for job {job_id}, batch {batch_year}")
    
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
            with zipfile.ZipFile(archive_path, 'r') as ref:
                ref.extractall(temp_dir)
        elif ext in (".tar", ".gz", ".tgz"):
            with tarfile.open(archive_path, 'r:*') as ref:
                ref.extractall(temp_dir)
        elif ext == ".rar":
            try:
                import rarfile
                with rarfile.RarFile(archive_path) as ref:
                    ref.extractall(temp_dir)
            except Exception as e:
                raise RuntimeError(f"RAR extraction failed or rarfile library not configured: {e}")
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
                        dst = os.path.join(flat_pdf_dir, f"{base_name}_{counter}{suffix}")
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
        local_temp_path = Path(tempfile.gettempdir()) / excel_filename

        # Remove stale local temp file if it exists
        if local_temp_path.exists():
            try:
                local_temp_path.unlink()
            except Exception:
                pass

        try:
            if excel_exists_in_supabase(excel_filename, supabase_folder):
                logger.info(f"Existing consolidated Excel found in Supabase. Downloading for incremental update...")
                downloaded_path = download_excel_from_supabase(excel_filename, supabase_folder)
                shutil.move(downloaded_path, local_temp_path)
        except Exception as e:
            logger.warning(f"Failed to fetch existing Excel from Supabase (non-fatal): {e}")
        
        import asyncio
        loop = asyncio.get_event_loop()

        def progress_callback(current, total):
            async def update_db():
                try:
                    async with bm.session_scope(batch_year) as session:
                        result = await session.execute(select(Job).where(Job.id == job_id))
                        job = result.scalars().first()
                        if job:
                            job.progress = current
                            await session.commit()
                            logger.info(f"🔄 Progress updated in database: {current} / {total} PDFs done")
                except Exception as db_err:
                    logger.error(f"❌ Failed to update job progress in DB: {db_err}")
            
            asyncio.run_coroutine_threadsafe(update_db(), loop)
        
        excel_url = await loop.run_in_executor(
            None, 
            process_pdfs, 
            excel_filename, 
            flat_pdf_dir,
            supabase_folder,
            progress_callback
        )
        
        if not excel_url:
            raise RuntimeError("PDF processing completed but failed to generate or upload Excel.")

        # 5. Success
        async with bm.session_scope(batch_year) as session:
            result = await session.execute(select(Job).where(Job.id == job_id))
            job = result.scalars().first()
            if job:
                job.status = "done"
                job.progress = 100
                job.excel_url = excel_url
                await session.commit()
                
        logger.info(f"Job {job_id} completed successfully! Excel URL: {excel_url}")

    except Exception as e:
        logger.error(f"Error processing archive for job {job_id}: {e}", exc_info=True)
        async with bm.session_scope(batch_year) as session:
            result = await session.execute(select(Job).where(Job.id == job_id))
            job = result.scalars().first()
            if job:
                job.status = "failed"
                job.error = str(e)
                await session.commit()
                
    finally:
        _pdf_processing_semaphore.release()
        # Clean up temporary directory and uploaded zip file
        try:
            shutil.rmtree(temp_dir)
            if os.path.exists(archive_path):
                os.remove(archive_path)
        except Exception as err:
            logger.warning(f"Failed to clean up temp files: {err}")
