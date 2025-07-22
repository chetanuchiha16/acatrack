import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from models.config import db_path, pdf_dir, img_dir
# Function to generate and display a chart for SubjectResult class
def plot_subject_result_performance(subject_result, root):
    fig, ax = plt.subplots()
    categories = ['Passed', 'Failed']
    values = [subject_result.pass_count, subject_result.pass_count - len(subject_result.students_data)]

    ax.pie(values, labels=categories, autopct='%1.1f%%', startangle=140)
    ax.set_title(f'Performance Distribution in {subject_result.subject_name}')

    # Embed plot in Tkinter window
    canvas = FigureCanvasTkAgg(fig, master=root)
    canvas.draw()
    canvas.get_tk_widget().pack()

    # Save the plot as a PNG image for PDF export
    fig.savefig(f"{img_dir}/subject_result_performance.png")
