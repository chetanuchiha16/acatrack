"""add batch_lifecycle table

Revision ID: a1b2c3d4e5f6
Revises: 2e48107d3fcb
Create Date: 2026-05-17 04:35:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "a1b2c3d4e5f6"
down_revision = "2e48107d3fcb"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create batchstatus enum type
    batchstatus = sa.Enum("IN_SETUP", "READY", "ACTIVE", "ARCHIVED", name="batchstatus")
    batchstatus.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "batch_lifecycle",
        sa.Column("batch_year", sa.Integer(), primary_key=True),
        sa.Column(
            "status",
            sa.Enum("IN_SETUP", "READY", "ACTIVE", "ARCHIVED", name="batchstatus"),
            nullable=False,
            server_default="IN_SETUP",
        ),
        sa.Column("section_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("subject_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("student_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("assignment_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=True,
            server_default=sa.text("now()"),
        ),
    )


def downgrade() -> None:
    op.drop_table("batch_lifecycle")
    sa.Enum(name="batchstatus").drop(op.get_bind(), checkfirst=True)
