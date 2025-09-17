import matplotlib
matplotlib.use('TkAgg')   # must be TkAgg for interactive Tk GUI
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import mplcursors
import textwrap
from models.paths import img_dir

def plot_student_marks(student, root):
    fig, ax = plt.subplots()

    # subject labels
    subjects = student.get("subject_codes") or [f"Sub {i+1}" for i in range(len(student["ia_marks"]))]
    ia_marks = student["ia_marks"]
    see_marks = student["see_marks"]
    total_marks = [ia + see for ia, see in zip(ia_marks, see_marks)]

    # stacked bars
    bars_ia = ax.bar(range(len(subjects)), ia_marks, label="IA Marks")
    bars_see = ax.bar(range(len(subjects)), see_marks, bottom=ia_marks, label="SEE Marks")

    # wrap long labels and set ticks
    wrapped = [textwrap.fill(s, 18) for s in subjects]
    ax.set_xticks(range(len(subjects)))
    ax.set_xticklabels(wrapped, rotation=30, ha="right", fontsize=8)

    ax.set_ylabel("Marks")
    ax.set_title(f"Subject-wise IA and SEE Marks for {student.get('name','Student')}")
    ax.legend()
    fig.tight_layout()

    # -----------------------
    # Explicit callback style
    # -----------------------
    cursor = mplcursors.cursor([bars_ia, bars_see], hover=True)

    def on_hover(sel):
        idx = sel.index
        # safe lookups with defaults
        subject_name = (student.get("subject_names") or subjects)[idx]
        ia = ia_marks[idx]
        see = see_marks[idx]
        total = total_marks[idx]
        credit = (student.get("credits") or ["N/A"] * len(subjects))[idx]
        status = (student.get("pass_fail") or ["N/A"] * len(subjects))[idx]

        sel.annotation.set_text(
            f"{subject_name}\nIA: {ia}, SEE: {see}, Total: {total}\nCredits: {credit}, Status: {status}"
        )

    cursor.connect("add", on_hover)   # ← THIS registers the handler

    # embed in Tkinter
    canvas = FigureCanvasTkAgg(fig, master=root)
    canvas.draw()
    canvas.get_tk_widget().pack()

    # save for PDF (OK to save) — but DO NOT close the figure if you want tooltips to work
    fig.savefig(f"{img_dir}/student_subject_marks.png")
    # plt.close(fig)  # <-- do NOT close here if you want hover interactivity
