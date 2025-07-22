import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from models.config import db_path, pdf_dir, img_dir
# Function to generate and display a chart for University class
def plot_university_totals(university, root):
    fig, ax = plt.subplots()
    student_names = [student.name for student in university.students]
    total_marks = [student.total_marks for student in university.students]

    ax.bar(student_names, total_marks, color='purple', alpha=0.6)
    ax.set_title("Total Marks for Each Student")
    ax.set_ylabel("Total Marks")
    ax.set_xticks(range(len(student_names)))
    ax.set_xticklabels(student_names, rotation=45)

    # Embed plot in Tkinter window
    canvas = FigureCanvasTkAgg(fig, master=root)
    canvas.draw()
    canvas.get_tk_widget().pack()

    # Save plot as image for PDF export
    fig.savefig(f"{img_dir}/university_totals.png")
    plt.close(fig)  # Close the figure to free memory
