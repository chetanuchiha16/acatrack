import matplotlib
matplotlib.use('Agg')  # headless backend for Flask
import matplotlib.pyplot as plt
import io
import base64

def plot_subject_result_performance(subject_result):
    """
    Returns subject performance pie chart as Base64 PNG string (in-memory)
    """
    fig, ax = plt.subplots()
    
    categories = ['Passed', 'Failed']
    failed_count = len(subject_result.students_data) - subject_result.pass_count
    values = [subject_result.pass_count, failed_count]

    ax.pie(values, labels=categories, autopct='%1.1f%%', startangle=140)
    ax.set_title(f'Performance Distribution in {subject_result.subject_name}')

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
