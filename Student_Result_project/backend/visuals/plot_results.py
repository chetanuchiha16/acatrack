import matplotlib
matplotlib.use('Agg')  # headless backend for Flask
import matplotlib.pyplot as plt
from models.paths import img_dir

def plot_subject_result_performance(subject_result):
    fig, ax = plt.subplots()
    
    categories = ['Passed', 'Failed']
    # Compute failed count correctly
    failed_count = len(subject_result.students_data) - subject_result.pass_count
    values = [subject_result.pass_count, failed_count]

    ax.pie(values, labels=categories, autopct='%1.1f%%', startangle=140)
    ax.set_title(f'Performance Distribution in {subject_result.subject_name}')

    # Save the plot as a PNG image
    file_path = f"{img_dir}/subject_result_performance.png"
    fig.savefig(file_path)
    plt.close(fig)  # Close figure to free memory
    
    return file_path
