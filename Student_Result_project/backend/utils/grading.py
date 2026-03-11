def calculate_pass_fail(ia_marks, see_marks, credits):
    status_list = []
    for ia, see, credit in zip(ia_marks, see_marks, credits):
        if credit == 0:
            status_list.append("No Credits")
        elif see == 0:
            if ia >= 20: 
                status_list.append("Pass")
            else:
                status_list.append("Fail")
        elif ia >= 20 and see >= 18:
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

        if total_score >= 90: grade_points = 10
        elif total_score >= 80: grade_points = 9
        elif total_score >= 70: grade_points = 8
        elif total_score >= 60: grade_points = 7
        elif total_score >= 50: grade_points = 6
        elif total_score >= 40: grade_points = 5
        elif total_score >= 30: grade_points = 3
        elif total_score >= 20: grade_points = 2
        elif total_score >= 10: grade_points = 1
        else: grade_points = 0

        obtained += grade_points * credit
    return obtained

def calculate_sgpa_for_semester(ia_marks, see_marks, credits):
    obtained = calculate_obtained_credits(ia_marks, see_marks, credits)
    total_credits = sum(credits)
    if total_credits == 0: return 0
    return obtained / total_credits

def calculate_cgpa(previous_data, current_sgpa, current_credits):
    all_semesters = previous_data + [
        {"sgpa": current_sgpa, "credits": current_credits}
    ]

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
