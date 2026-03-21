import matplotlib.pyplot as plt


def plot_subject_marks(subject_names, subject_codes, ia_marks, see_marks, name):
    subjects = [
        f"{s_name} ({code})" for s_name, code in zip(subject_names, subject_codes)
    ]
    fig = plt.figure(figsize=(10, 6))

    plt.bar(subjects, ia_marks, label="IA Marks", color="skyblue", alpha=0.7)
    plt.bar(
        subjects,
        see_marks,
        label="SEE Marks",
        color="salmon",
        alpha=0.7,
        bottom=ia_marks,
    )

    plt.xlabel("Subjects")
    plt.ylabel("Marks")
    plt.title(f"Subject-wise IA and SEE Marks for {name}")
    plt.xticks(rotation=45, ha="right")
    plt.legend()
    plt.tight_layout()

    return fig
