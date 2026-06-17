from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path("/Users/prathamgupta/Desktop/AttendanceSystem")
OUT_DIR = ROOT / "artifacts" / "marketing"
LOGO = ROOT / "frontend" / "src" / "assets" / "peeplify-logo.png"
PDF_PATH = OUT_DIR / "Peeplify-Showcase-Brochure.pdf"
PREVIEW_PATH = OUT_DIR / "Peeplify-Showcase-Brochure-preview.png"

PRIMARY = colors.HexColor("#2563eb")
PRIMARY_DARK = colors.HexColor("#163055")
TEXT_SOFT = colors.HexColor("#58708f")
CARD_BG = colors.HexColor("#edf5ff")
CARD_BG_STRONG = colors.HexColor("#dbeafe")
WHITE = colors.white


def wrap_lines(text, font_name, font_size, max_width):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if stringWidth(candidate, font_name, font_size) <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_wrapped(c, text, x, y, width, font_name="Helvetica", font_size=10, color=TEXT_SOFT, leading=14):
    c.setFillColor(color)
    c.setFont(font_name, font_size)
    lines = wrap_lines(text, font_name, font_size, width)
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def draw_feature_card(c, x, y, w, h, title, body, strong=False):
    c.setFillColor(CARD_BG_STRONG if strong else CARD_BG)
    c.roundRect(x, y - h, w, h, 16, fill=1, stroke=0)
    c.setFillColor(PRIMARY_DARK)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(x + 14, y - 24, title)
    draw_wrapped(c, body, x + 14, y - 42, w - 28, font_size=9.2, color=TEXT_SOFT, leading=11.5)


def generate_pdf():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(PDF_PATH), pagesize=letter)
    page_w, page_h = letter
    margin = 34

    c.setFillColor(colors.HexColor("#f7fbff"))
    c.rect(0, 0, page_w, page_h, fill=1, stroke=0)

    c.setStrokeColor(colors.HexColor("#d6e5ff"))
    c.setLineWidth(1)
    c.roundRect(14, 14, page_w - 28, page_h - 28, 18, fill=0, stroke=1)

    if LOGO.exists():
        logo = ImageReader(str(LOGO))
        c.drawImage(logo, margin, page_h - 145, width=120, height=120, mask="auto")

    c.setFillColor(PRIMARY)
    c.setFont("Helvetica-Bold", 30)
    c.drawString(170, page_h - 70, "PEEPLIFY")
    c.setFillColor(PRIMARY_DARK)
    c.setFont("Helvetica-Bold", 17)
    c.drawString(170, page_h - 95, "Workforce Management, Simplified")
    draw_wrapped(
        c,
        "Attendance, payroll, leave, roster, proof and owner control in one easy mobile-first platform.",
        170,
        page_h - 118,
        360,
        font_size=11,
        color=TEXT_SOFT,
        leading=14,
    )

    c.setFont("Helvetica-Bold", 11.5)
    c.setFillColor(PRIMARY_DARK)
    c.drawCentredString(page_w / 2, page_h - 170, "Built for Indian businesses with 10–50 employees")

    draw_wrapped(
        c,
        "Peeplify helps owners reduce attendance disputes, track staff with selfie and GPS proof, manage leave and payroll, and run day-to-day workforce operations from phone or desktop.",
        margin,
        page_h - 195,
        page_w - (2 * margin),
        font_size=10.3,
        color=TEXT_SOFT,
        leading=13,
    )

    c.setFillColor(PRIMARY_DARK)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(margin, page_h - 238, "What Peeplify handles")

    card_y = page_h - 252
    card_w = 166
    card_h = 74
    gap = 12
    features = [
        ("Attendance with proof", "Selfie + location-backed check-in and check-out with employee profile support.", False),
        ("Leave and corrections", "Leave requests, missed punch fixes, owner approvals and clean monthly records.", False),
        ("Payroll clarity", "Salary snapshots, advances, payable days and branch-specific workday rules.", True),
        ("Roster management", "Shift setup, templates, weekly offs, planning, conflicts and assignment control.", False),
        ("Owner dashboard", "See present, absent, late and forgot-checkout staff at a glance.", False),
        ("Commercial-ready", "Plans, billing, invoices, support requests and renewal flow.", True),
    ]
    for i, (title, body, strong) in enumerate(features):
        col = i % 3
        row = i // 3
        x = margin + col * (card_w + gap)
        y = card_y - row * (card_h + gap)
        draw_feature_card(c, x, y, card_w, card_h, title, body, strong)

    industries_y = page_h - 432
    c.setFillColor(PRIMARY_DARK)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(margin, industries_y, "Ideal for these businesses")

    left_x = margin
    right_x = 310
    bullet_y = industries_y - 20
    c.setFont("Helvetica", 10)
    c.setFillColor(TEXT_SOFT)
    left_items = [
        "Hospitals, nursing homes, clinics, diagnostic centres",
        "Hotels, guest houses, restaurants, banquet halls",
        "Retail shops, supermarkets, showrooms",
        "Pharmacies, salons, gyms and fitness centres",
    ]
    right_items = [
        "Factories, workshops, petrol pumps and plants",
        "Security agencies and housekeeping services",
        "Schools, coaching and training institutes",
        "IT companies, consultancies and offices",
    ]
    for item in left_items:
        bullet_y = draw_wrapped(c, f"• {item}", left_x, bullet_y, 240, font_size=9.8, color=TEXT_SOFT, leading=12)
        bullet_y -= 2
    bullet_y = industries_y - 20
    for item in right_items:
        bullet_y = draw_wrapped(c, f"• {item}", right_x, bullet_y, 250, font_size=9.8, color=TEXT_SOFT, leading=12)
        bullet_y -= 2

    insight_y = page_h - 553
    draw_feature_card(c, margin, insight_y, 250, 56, "Target market", "Punjab and North India SMBs that want stronger discipline without enterprise complexity.")
    draw_feature_card(c, 310, insight_y, 268, 56, "Why owners choose it", "Simple setup, mobile-first workflow, clearer payroll and fewer attendance disputes.", True)

    pricing_y = page_h - 625
    c.setFillColor(PRIMARY_DARK)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(margin, pricing_y, "Simple pricing")

    pricing_cards = [
        ("Starter", "Up to 10 employees", "INR 1199 / month", False),
        ("Growth", "Up to 25 employees", "INR 1999 / month", False),
        ("Business", "Up to 50 employees + multiple branches", "INR 2999 / month", True),
    ]
    p_y = pricing_y - 12
    for i, (title, sub, price, strong) in enumerate(pricing_cards):
        x = margin + i * (card_w + gap)
        draw_feature_card(c, x, p_y, card_w, 66, title, f"{sub}\n{price}", strong)

    c.setFillColor(CARD_BG)
    c.roundRect(margin, 74, page_w - (2 * margin), 44, 16, fill=1, stroke=0)
    c.setFillColor(PRIMARY_DARK)
    c.setFont("Helvetica", 10)
    c.drawCentredString(page_w / 2, 101, "Quarterly, half-yearly, and yearly discounts available. 3-day free access for new workspaces.")

    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(page_w / 2, 58, "Book a demo or start your workspace today")
    c.setFont("Helvetica", 9.6)
    c.setFillColor(TEXT_SOFT)
    c.drawCentredString(page_w / 2, 43, "www.peeplify.com  •  pratham4714@gmail.com  •  Track people, time and payouts in one place")

    c.save()


def generate_preview():
    width, height = 1275, 1650
    image = Image.new("RGBA", (width, height), "#f7fbff")
    draw = ImageDraw.Draw(image)

    try:
        title_font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 54)
        subtitle_font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 30)
        body_font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 24)
        body_bold = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 24)
        small_font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 20)
    except Exception:
        title_font = subtitle_font = body_font = body_bold = small_font = ImageFont.load_default()

    draw.rounded_rectangle((20, 20, width - 20, height - 20), radius=20, outline="#d6e5ff", width=2)

    if LOGO.exists():
        logo = Image.open(LOGO).convert("RGBA")
        logo.thumbnail((190, 190))
        image.alpha_composite(logo, (52, 48))

    draw.text((245, 68), "PEEPLIFY", font=title_font, fill="#2563eb")
    draw.text((245, 122), "Workforce Management, Simplified", font=subtitle_font, fill="#163055")
    draw.text((245, 170), "Attendance, payroll, leave, roster, proof and owner control", font=body_font, fill="#58708f")
    draw.text((245, 202), "in one easy mobile-first platform.", font=body_font, fill="#58708f")

    draw.text((260, 272), "Built for Indian businesses with 10–50 employees", font=body_bold, fill="#163055")
    draw.text((55, 315), "Peeplify helps owners reduce attendance disputes, track staff with selfie and GPS proof,", font=body_font, fill="#58708f")
    draw.text((55, 347), "manage leave and payroll, and run day-to-day workforce operations from phone or desktop.", font=body_font, fill="#58708f")

    draw.text((55, 395), "What Peeplify handles", font=body_bold, fill="#163055")

    cards = [
        ("Attendance with proof", "Selfie + location-backed check-in and\ncheck-out with employee profile support.", False),
        ("Leave and corrections", "Leave requests, missed punch fixes,\nowner approvals and clean records.", False),
        ("Payroll clarity", "Salary snapshots, advances, payable days\nand branch-specific workday rules.", True),
        ("Roster management", "Shift setup, templates, weekly offs,\nplanning, conflicts and assignments.", False),
        ("Owner dashboard", "See present, absent, late and forgot-\ncheckout staff at a glance.", False),
        ("Commercial-ready", "Plans, billing, invoices, support requests\nand renewal flow.", True),
    ]
    start_x = 55
    start_y = 430
    card_w = 365
    card_h = 112
    gap = 18
    for i, (title, body, strong) in enumerate(cards):
        col = i % 3
        row = i // 3
        x = start_x + col * (card_w + gap)
        y = start_y + row * (card_h + gap)
        draw.rounded_rectangle((x, y, x + card_w, y + card_h), radius=18, fill="#dbeafe" if strong else "#edf5ff")
        draw.text((x + 16, y + 14), title, font=body_bold, fill="#163055")
        line_y = y + 48
        for line in body.split("\n"):
            draw.text((x + 16, line_y), line, font=small_font, fill="#58708f")
            line_y += 24

    draw.text((55, 694), "Ideal for these businesses", font=body_bold, fill="#163055")
    left_lines = [
        "• Hospitals, nursing homes, clinics, diagnostic centres",
        "• Hotels, guest houses, restaurants, banquet halls",
        "• Retail shops, supermarkets, showrooms",
        "• Pharmacies, salons, gyms and fitness centres",
    ]
    right_lines = [
        "• Factories, workshops, petrol pumps and plants",
        "• Security agencies and housekeeping services",
        "• Schools, coaching and training institutes",
        "• IT companies, consultancies and offices",
    ]
    y = 734
    for line in left_lines:
        draw.text((55, y), line, font=small_font, fill="#58708f")
        y += 30
    y = 734
    for line in right_lines:
        draw.text((640, y), line, font=small_font, fill="#58708f")
        y += 30

    draw.rounded_rectangle((55, 870, 525, 970), radius=18, fill="#edf5ff")
    draw.text((72, 892), "Target market", font=body_bold, fill="#163055")
    draw.text((72, 930), "Punjab and North India SMBs that want stronger", font=small_font, fill="#58708f")
    draw.text((72, 955), "discipline without enterprise complexity.", font=small_font, fill="#58708f")

    draw.rounded_rectangle((565, 870, 1220, 970), radius=18, fill="#dbeafe")
    draw.text((582, 892), "Why owners choose it", font=body_bold, fill="#163055")
    draw.text((582, 930), "Simple setup, mobile-first workflow, clearer payroll", font=small_font, fill="#58708f")
    draw.text((582, 955), "and fewer attendance disputes.", font=small_font, fill="#58708f")

    draw.text((55, 1012), "Simple pricing", font=body_bold, fill="#163055")
    pricing = [
        ("Starter", "Up to 10 employees", "INR 1199 / month", False),
        ("Growth", "Up to 25 employees", "INR 1999 / month", False),
        ("Business", "Up to 50 employees + multiple branches", "INR 2999 / month", True),
    ]
    y = 1046
    for i, (title, sub, price, strong) in enumerate(pricing):
        x = 55 + i * (365 + 18)
        draw.rounded_rectangle((x, y, x + 365, y + 118), radius=18, fill="#dbeafe" if strong else "#edf5ff")
        draw.text((x + 16, y + 18), title, font=body_bold, fill="#163055")
        draw.text((x + 16, y + 48), sub, font=small_font, fill="#58708f")
        draw.text((x + 16, y + 82), price, font=body_bold, fill="#2563eb")

    draw.rounded_rectangle((55, 1210, 1220, 1272), radius=18, fill="#edf5ff")
    draw.text((210, 1233), "Quarterly, half-yearly, and yearly discounts available. 3-day free access for new workspaces.", font=small_font, fill="#163055")

    draw.text((330, 1320), "Book a demo or start your workspace today", font=body_bold, fill="#163055")
    draw.text((185, 1354), "www.peeplify.com  •  pratham4714@gmail.com  •  Track people, time and payouts in one place", font=small_font, fill="#58708f")
    image.convert("RGB").save(PREVIEW_PATH)


def main():
    generate_pdf()
    generate_preview()
    print(PDF_PATH)
    print(PREVIEW_PATH)


if __name__ == "__main__":
    main()
