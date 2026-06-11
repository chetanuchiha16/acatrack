Perfect 👍 Let’s restructure it so a **student has exactly one mentor** instead of that `mentors` list.

Right now, you have an **association table** `MentorStudent`, which is overkill if the rule is *1 student → 1 mentor*.
We can simplify like this:

---

### ✅ Updated models

```python
from app_init import db

class StudentAuth(db.Model):
    __tablename__ = 'students'
    username = db.Column(db.String(10), primary_key=True, unique=True)
    name = db.Column(db.String(100))
    password = db.Column(db.String(128), nullable=True)   # bcrypt hash
    student_email = db.Column(db.String(100), nullable=True)
    student_phno = db.Column(db.String(20), nullable=True)

    # Direct one-to-one link
    mentor_id = db.Column(db.Integer, db.ForeignKey('mentors.id'))
    mentor = db.relationship('Mentor', back_populates='student', uselist=False)


class ParentAuth(db.Model):
    __tablename__ = "parents"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(10), unique=True, nullable=False)
    password = db.Column(db.String(128), nullable=False)

    email = db.Column(db.String(100), nullable=True)
    phone = db.Column(db.String(20), nullable=True)

    name = db.Column(db.String(100), nullable=True)   # actual parent name if available
    relation = db.Column(db.String(50), nullable=True, default="Guardian")

    student_usn = db.Column(
        db.String(10),
        db.ForeignKey("students.username"),
        nullable=False,
        unique=True
    )
    student = db.relationship("StudentAuth", backref=db.backref("parent_account", uselist=False))


class Teacher(db.Model):
    __tablename__ = 'teachers'
    username = db.Column(db.String(10), primary_key=True, unique=True)
    mentor_id = db.Column(
        db.Integer,
        db.ForeignKey('mentors.id', name='fk_teachers_mentor_id'),
        nullable=True
    )
    name = db.Column(db.String(100))
    password = db.Column(db.String(128), nullable=True)


class Mentor(db.Model):
    __tablename__ = 'mentors'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), unique=True, nullable=False)

    # back link to student
    student = db.relationship('StudentAuth', back_populates='mentor', uselist=False)
```

---

### 🔑 What changed?

1. `StudentAuth` now has `mentor_id` directly.
   → No need for `MentorStudent` table anymore.
   → Query is much simpler.

2. Defined `mentor` relationship as `uselist=False` (so it’s **1-to-1**).

3. In `Mentor`, we set `student = relationship(..., uselist=False)` to make it bidirectional.

---

### Example Usage

```python
parent = ParentAuth.query.filter_by(username="abc_parent").first()

logger.debug(parent.student.name)           # Student's name
logger.debug(parent.student.mentor.name)    # Student's mentor name
logger.debug(parent.student.mentor.id)      # Student's mentor id
```

---

👉 With this, in your login route you can directly do:

```python
elif who == "Parent":
    mentor_id = user.student.mentor_id if user.student else None
```

---

Do you want me to also show you how to **migrate existing `MentorStudent` table data** into this new `mentor_id` column?
