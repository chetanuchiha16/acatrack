from .auth import auth_bp
from .student_notes import student_notes_bp
from .send_studends_data import student_bp
from .send_uni_data import uni_bp
from .send_sub_res_data import sub_bp
from .send_sem_res_data import sem_bp
from .teacher_notes import teacher_notes_bp
from .excel import excel_bp
from .chatbot import chatbot_bp
def register_routes(app):
    app.register_blueprint(auth_bp)
    app.register_blueprint(student_bp)
    app.register_blueprint(student_notes_bp)
    app.register_blueprint(uni_bp)
    app.register_blueprint(sub_bp)
    app.register_blueprint(sem_bp)
    app.register_blueprint(teacher_notes_bp)
    app.register_blueprint(excel_bp)
    app.register_blueprint(chatbot_bp)