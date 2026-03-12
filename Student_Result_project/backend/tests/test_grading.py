import pytest

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

def test_calculate_pass_fail():
    assert calculate_pass_fail([20], [18], [3]) == ["Pass"]
    assert calculate_pass_fail([19], [18], [3]) == ["Fail"]
    assert calculate_pass_fail([20], [17], [3]) == ["Fail"]
    assert calculate_pass_fail([10], [50], [3]) == ["Fail"]

def test_calculate_obtained_credits():
    assert calculate_obtained_credits([45], [45], [3]) == 30 # 90 total -> 10 * 3
    assert calculate_obtained_credits([35], [35], [4]) == 32 # 70 total -> 8 * 4

def test_calculate_sgpa():
    # 45+45=90 (10 pts) * 3 credits = 30
    # 35+35=70 (8 pts) * 4 credits = 32
    # Total obtained = 62. Total credits = 7. SGPA = 62/7 = 8.85
    assert round(calculate_sgpa_for_semester([45, 35], [45, 35], [3, 4]), 2) == 8.86
