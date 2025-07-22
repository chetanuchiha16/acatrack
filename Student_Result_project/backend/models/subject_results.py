import customtkinter as ctk
from models.config import db_path, pdf_dir, img_dir
# SubjectResult class
class SubjectResult:
    def __init__(self, subject_code, semester, university):
        self.subject_code = subject_code
        self.semester = semester
        self.university = university  # Instance of the University class
        self.students_data = self.fetch_students_data()
        self.total_students = len(university.students)  # Total students for the semester
        self.present_students = len(self.students_data)
        self.absent_students = self.total_students - self.present_students
        self.pass_count, self.fail_count = self.fetch_subject_stats()
        self.fcd_count, self.fc_count, self.sc_count = self.fetch_performance_categories()
        self.pass_percentage = self.calculate_pass_percentage()

    def fetch_students_data(self):
        """
        Fetch student data for the specific subject and semester.
        """
        students_data = []
        # Filter students from the University instance by semester
        filtered_students = [student for student in self.university.students if student.semester == self.semester]
        for student in filtered_students:
            if self.subject_code in student.subject_codes:
                index = student.subject_codes.index(self.subject_code)
                students_data.append({
                    "name": student.name ,
                    "USN": student.usn,
                    "ia": student.ia_marks[index] ,
                    "see": student.see_marks[index] ,
                    "Total_Marks": student.ia_marks[index] + student.see_marks[index],
                    "Credits": student.credits[index]
                })
        return students_data

    def fetch_subject_stats(self):
        """
        Calculate pass and fail counts for the subject.
        """
        pass_count = sum(1 for student in self.students_data if (student["ia"]>=20 and student["see"]>=18))
        fail_count = self.present_students - pass_count
        # for student in self.students_data:
            # if (student["ia"]<20 and student["see"]<18):
                # print("failed students",student["name"])
                                              
        return pass_count, fail_count

    def fetch_performance_categories(self):
        """
        Calculate counts for performance categories (FCD, FC, SC).
        """
        fcd_count = sum(1 for student in self.students_data if student["Total_Marks"] >= 70)
        fc_count = sum(1 for student in self.students_data if 60 <= student["Total_Marks"] < 70)
        sc_count = sum(1 for student in self.students_data if 50 <= student["Total_Marks"] < 60)
        return fcd_count, fc_count, sc_count

    def calculate_pass_percentage(self):
        """
        Calculate the pass percentage for the subject.
        """
        return (self.pass_count / self.present_students * 100) if self.present_students > 0 else 0

    def display_subject_results(self, output_widget=None):
        """
        Display the results for the subject, either to the console or to a widget.
        """
        result_str = (
            f"Results for Subject: {self.subject_code} in {self.semester}\n"
            f"Total Students: {self.total_students}\n"
            f"Present: {self.present_students}, Absent: {self.absent_students}\n"
            f"Passed: {self.pass_count}, Failed: {self.fail_count}\n"
            f"Pass Percentage: {self.pass_percentage:.2f}%\n"
            f"FCD (>70%): {self.fcd_count}\n"
            f"FC (60-70%): {self.fc_count}\n"
            f"SC (50-60%): {self.sc_count}\n"
            + "-" * 50 + "\n"
            f"PDF Saved"
        )

        if output_widget:
            output_widget.configure(state="normal")
            output_widget.delete("1.0", ctk.END)  # Clear previous content
            output_widget.insert(ctk.END, result_str)
            output_widget.configure(state="disabled")
        else:
            print(result_str)

    def plot_performance_pie_chart(self):
        """
        Plot a pie chart for performance distribution across categories.
        """
        import matplotlib.pyplot as plt
        categories = ['FCD (>70%)', 'FC (60-70%)', 'SC (50-60%)']
        values = [self.fcd_count, self.fc_count, self.sc_count]

        fig=plt.figure(figsize=(4, 4))
        plt.pie(values, labels=categories, autopct='%1.1f%%', startangle=140, 
                colors=['#ff9999', '#66b3ff', '#99ff99'])
        plt.title(f'Performance Distribution in {self.subject_code}')
        graph_path=f"{img_dir}/performance_pie_chart.png"
        plt.savefig(graph_path)
        #plt.show()
        return fig,graph_path

    def plot_attendance_pie_chart(self):
        """
        Plot a pie chart for attendance distribution.
        """
        import matplotlib.pyplot as plt
        labels = ['Present', 'Absent']
        values = [self.present_students, self.absent_students]

        fig=plt.figure(figsize=(4, 4))
        plt.pie(values, labels=labels, autopct='%1.1f%%', startangle=140, 
                colors=['#66b3ff', '#ffcc99'])
        plt.title(f'Attendance Distribution in {self.subject_code}')
        graph_path=f"{img_dir}/attendance_pie_chart.png"
        plt.savefig(graph_path)
        #plt.show()
        return fig,graph_path