import matplotlib
matplotlib.use('Agg')  # headless backend for Flask
import matplotlib.pyplot as plt
import io
import base64

def plot_university_totals(university):
    """
    Generate a bar chart of total marks for each student in the university.
    Returns a Base64 PNG string (in-memory) suitable for JSON response.
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

    # Convert figure to in-memory PNG
    buf = io.BytesIO()
    fig.savefig(buf, format="png")
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode("utf-8")

    # Cleanup
    fig.clf()
    fig.canvas.close_event()
    plt.close(fig)

    # Return inline Base64 PNG
    return f"data:image/png;base64,{img_base64}"
