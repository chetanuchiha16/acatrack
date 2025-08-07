from .auth import auth_bp
from .student_notes import student_notes_bp
from .send_studends_data import student_bp
def register_routes(app):
    app.register_blueprint(auth_bp)
    app.register_blueprint(student_bp)
    app.register_blueprint(student_notes_bp)