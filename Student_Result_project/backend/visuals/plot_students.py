import matplotlib
matplotlib.use('Agg')  # headless backend for Flask
import matplotlib.pyplot as plt
import textwrap
import io
import base64

def plot_student_marks(student):
    """
    Generate a stacked bar chart of IA and SEE marks for a student.
    Returns a Base64 PNG string (in-memory) suitable for JSON response.
    """
    fig, ax = plt.subplots(figsize=(8, 4))

    # subject labels
    subjects = student.get("subject_codes") or [f"Sub {i+1}" for i in range(len(student["ia_marks"]))]
    ia_marks = student["ia_marks"]
    see_marks = student["see_marks"]

    # stacked bars
    ax.bar(range(len(subjects)), ia_marks, label="IA Marks", color="skyblue", alpha=0.7)
    ax.bar(range(len(subjects)), see_marks, bottom=ia_marks, label="SEE Marks", color="salmon", alpha=0.7)

    # wrap long labels and set ticks
    wrapped = [textwrap.fill(s, 18) for s in subjects]
    ax.set_xticks(range(len(subjects)))
    ax.set_xticklabels(wrapped, rotation=30, ha="right", fontsize=8)

    ax.set_ylabel("Marks")
    ax.set_title(f"Subject-wise IA and SEE Marks for {student.get('name','Student')}")
    ax.legend()
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
