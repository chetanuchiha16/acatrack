import matplotlib
matplotlib.use('Agg')  # headless backend for Flask
import matplotlib.pyplot as plt
import textwrap
from models.paths import img_dir

def plot_student_marks(student):
    """
    Generate a stacked bar chart of IA and SEE marks for a student.
    Returns the file path of the saved PNG.
    Flask-friendly (no Tkinter, no hover interactivity).
    """
    fig, ax = plt.subplots(figsize=(8, 4))

    # subject labels
    subjects = student.get("subject_codes") or [f"Sub {i+1}" for i in range(len(student["ia_marks"]))]
    ia_marks = student["ia_marks"]
    see_marks = student["see_marks"]
    total_marks = [ia + see for ia, see in zip(ia_marks, see_marks)]

    # stacked bars
    ax.bar(range(len(subjects)), ia_marks, label="IA Marks")
    ax.bar(range(len(subjects)), see_marks, bottom=ia_marks, label="SEE Marks")

    # wrap long labels and set ticks
    wrapped = [textwrap.fill(s, 18) for s in subjects]
    ax.set_xticks(range(len(subjects)))
    ax.set_xticklabels(wrapped, rotation=30, ha="right", fontsize=8)

    ax.set_ylabel("Marks")
    ax.set_title(f"Subject-wise IA and SEE Marks for {student.get('name','Student')}")
    ax.legend()
    fig.tight_layout()

    # save plot
    file_path = f"{img_dir}/student_subject_marks.png"
    fig.savefig(file_path)
    plt.close(fig)

    return file_path
