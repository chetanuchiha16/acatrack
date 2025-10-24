import matplotlib
matplotlib.use('Agg')  # headless backend for Flask
import matplotlib.pyplot as plt
from models.paths import img_dir

def plot_university_totals(university):
    """
    Generate a bar chart of total marks for each student in the university.
    Returns the file path of the saved PNG.
    Flask-friendly (no Tkinter).
    """
    fig, ax = plt.subplots(figsize=(10, 5))

    student_names = [student.name for student in university.students]
    total_marks = [student.total_marks for student in university.students]

    ax.bar(student_names, total_marks, color='purple', alpha=0.6)
    ax.set_title("Total Marks for Each Student")
    ax.set_ylabel("Total Marks")
    ax.set_xticks(range(len(student_names)))
    ax.set_xticklabels(student_names, rotation=45, ha="right", fontsize=8)

    fig.tight_layout()

    # save plot
    file_path = f"{img_dir}/university_totals.png"
    fig.savefig(file_path)
    plt.close(fig)

    return file_path
