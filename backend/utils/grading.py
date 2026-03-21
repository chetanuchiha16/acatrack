# Grading Constants
MIN_IA_PASS = 20
MIN_SEE_PASS = 18

GRADE_POINTS = [
    (90, 10),
    (80, 9),
    (70, 8),
    (60, 7),
    (50, 6),
    (40, 5),
    (30, 3),
    (20, 2),
    (10, 1),
]


def calculate_pass_fail(ia_marks, see_marks, credits):
    status_list = []
    for ia, see, credit in zip(ia_marks, see_marks, credits):
        if credit == 0:
            status_list.append("No Credits")
        elif see == 0:
            if ia >= MIN_IA_PASS:
                status_list.append("Pass")
            else:
                status_list.append("Fail")
        elif ia >= MIN_IA_PASS and see >= MIN_SEE_PASS:
            status_list.append("Pass")
        else:
            status_list.append("Fail")
    return status_list


def calculate_obtained_credits(ia_marks, see_marks, credits):
    obtained = 0
    for ia, see, credit in zip(ia_marks, see_marks, credits):
        total_score = ia + see
        if credit == 0:
            continue

        grade_points = 0
        for threshold, points in GRADE_POINTS:
            if total_score >= threshold:
                grade_points = points
                break

        obtained += grade_points * credit
    return obtained


def calculate_sgpa_for_semester(ia_marks, see_marks, credits):
    obtained = calculate_obtained_credits(ia_marks, see_marks, credits)
    total_credits = sum(credits)
    if total_credits == 0:
        return 0
    return obtained / total_credits


def calculate_cgpa(previous_data, current_sgpa, current_credits):
    all_semesters = previous_data + [{"sgpa": current_sgpa, "credits": current_credits}]

    sum_sgpa_x_credits = 0.0
    cumulative_credits = 0

    for sem in all_semesters:
        if sem["credits"] > 0:
            sum_sgpa_x_credits += sem["sgpa"] * sem["credits"]
            cumulative_credits += sem["credits"]

    if cumulative_credits == 0:
        return 0.0

    return round(sum_sgpa_x_credits / cumulative_credits, 2)


def categorize(percentage, pass_fail_list):
    if percentage >= 70:
        return "First Class with Distinction (FCD)"
    elif 60 <= percentage < 70:
        return "First Class (FC)"
    elif 35 <= percentage < 60:
        return "Second Class (SC)"
    elif "Fail" in pass_fail_list:
        return "Fail"
    return "Unknown"
