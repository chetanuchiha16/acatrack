"""
Route registration — includes all FastAPI routers into the app.
"""

from fastapi import FastAPI


def include_routers(app: FastAPI) -> None:
    from routes.auth import router as auth_router
    from routes.admin_routes import router as admin_router
    from routes.excel import router as excel_router
    from routes.forgot_password import router as forgot_password_router
    from routes.mentee_meetings import router as mentee_meetings_router
    from routes.mentee_recieve_email import router as mentee_email_router
    from routes.mentee_record import router as mentee_record_router
    from routes.mentor_meetings import router as mentor_meetings_router
    from routes.mentor_send_email import router as mentor_send_email_router
    from routes.mentors import router as mentors_router
    from routes.parent import router as parent_router
    from routes.pdftoexcel_route import router as pdf_router
    from routes.scrape_route import router as scrape_router
    from routes.send_email import router as send_email_router
    from routes.send_sem_res_data import router as sem_res_router
    from routes.send_studends_data import router as students_router
    from routes.send_sub_res_data import router as sub_res_router
    from routes.send_uni_data import router as uni_router
    from routes.student_ai import router as ai_router
    from routes.student_analysis import router as analysis_router
    from routes.student_notes import router as student_notes_router
    from routes.teacher_notes import router as teacher_notes_router

    app.include_router(auth_router)
    app.include_router(admin_router)
    app.include_router(excel_router)
    app.include_router(forgot_password_router)
    app.include_router(mentee_meetings_router)
    app.include_router(mentee_email_router)
    app.include_router(mentee_record_router)
    app.include_router(mentor_meetings_router)
    app.include_router(mentor_send_email_router)
    app.include_router(mentors_router)
    app.include_router(parent_router)
    app.include_router(pdf_router)
    app.include_router(scrape_router)
    app.include_router(send_email_router)
    app.include_router(sem_res_router)
    app.include_router(students_router)
    app.include_router(sub_res_router)
    app.include_router(uni_router)
    app.include_router(ai_router)
    app.include_router(analysis_router)
    app.include_router(student_notes_router)
    app.include_router(teacher_notes_router)
