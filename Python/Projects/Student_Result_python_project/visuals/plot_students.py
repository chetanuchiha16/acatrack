import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from models.config import db_path, pdf_dir, img_dir
# Function to generate and display a chart in Tkinter for Student class
def plot_student_marks(student, root):
    fig, ax = plt.subplots()
    subjects = [f"Subject {i + 1}" for i in range(len(student['ia_marks']))]
    ia_marks = student['ia_marks']
    see_marks = student['see_marks']

    ax.bar(subjects, ia_marks, label="IA Marks", color='b')
    ax.bar(subjects, see_marks, bottom=ia_marks, label="SEE Marks", color='r')
    ax.set_title("Subject-wise Marks")
    ax.set_ylabel("Marks")
    ax.legend()

    # Embed plot in Tkinter window
    canvas = FigureCanvasTkAgg(fig, master=root)
    canvas.draw()
    canvas.get_tk_widget().pack()

    # Save plot as image for PDF export
    fig.savefig(f"{img_dir}/student_subject_marks.png")
    plt.close(fig)  # Close the figure to free memory