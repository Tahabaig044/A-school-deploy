/**
 * Comprehensive seed script — populates every model so every page has data.
 * Usage:  npx tsx --env-file=.env scripts/seed.ts
 */
import { PrismaClient } from "../lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const ADMIN_ID = "41c3b981-2e39-4539-b0b4-8b87bc9750ae"
const u = () => crypto.randomUUID()
const ago = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}
const fromNow = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

async function main() {
  console.log("Cleaning old data...")
  await prisma.$executeRaw`TRUNCATE TABLE audit_logs CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE notifications CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE messages CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE book_issues CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE library_books CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE student_transport CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE transport_routes CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE vehicles CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE expenses CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE payments CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE fee_invoice_items CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE fee_invoices CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE student_fee_plans CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE fee_structures CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE report_cards CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE exam_results CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE exam_schedules CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE exams CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE exam_types CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE homework_submissions CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE homework CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE announcements CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE leave_requests CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE staff_attendance CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE student_attendance CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE timetables CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE teacher_assignments CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE class_subjects CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE student_parents CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE student_enrollments CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE student_documents CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE students CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE parents CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE staff CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE teachers CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE subjects CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE sections CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE classes CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE settings CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE academic_sessions CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE branches CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE profiles CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE schools CASCADE`
  console.log("Old data cleaned\n")

  // Re-create the super admin profile (was deleted by truncate)
  await prisma.profile.create({
    data: { id: ADMIN_ID, role: "SUPER_ADMIN", firstName: "Admin", lastName: "User" },
  })

  console.log("Seeding...\n")

  const school = await prisma.school.create({
    data: {
      id: u(),
      name: "Greenwood International School",
      code: "GIS",
      address: "123 Education Lane, Springfield",
      phone: "+1-555-0100",
      email: "info@greenwood.edu",
    },
  })
  const b1 = await prisma.branch.create({
    data: {
      id: u(),
      school: { connect: { id: school.id } },
      name: "Main Campus",
      code: "MAIN",
      address: "123 Education Lane",
      phone: "+1-555-0101",
      email: "main@greenwood.edu",
    },
  })
  const b2 = await prisma.branch.create({
    data: {
      id: u(),
      school: { connect: { id: school.id } },
      name: "North Campus",
      code: "NORTH",
      address: "456 North Ave",
      phone: "+1-555-0102",
      email: "north@greenwood.edu",
    },
  })
  await prisma.profile.update({
    where: { id: ADMIN_ID },
    data: { school: { connect: { id: school.id } }, branch: { connect: { id: b1.id } } },
  })
  console.log("School + branches + admin linked")

  const s1 = await prisma.academicSession.create({
    data: {
      id: u(),
      school: { connect: { id: school.id } },
      branch: { connect: { id: b1.id } },
      name: "2025-2026",
      startDate: new Date("2025-04-01"),
      endDate: new Date("2026-03-31"),
      isCurrent: true,
    },
  })
  const s2 = await prisma.academicSession.create({
    data: {
      id: u(),
      school: { connect: { id: school.id } },
      branch: { connect: { id: b1.id } },
      name: "2024-2025",
      startDate: new Date("2024-04-01"),
      endDate: new Date("2025-03-31"),
      isCurrent: false,
    },
  })

  // ── Profiles ──
  const tNames = [
    ["Alice", "Thompson"],
    ["Bob", "Williams"],
    ["Carol", "Brown"],
    ["David", "Davis"],
    ["Eva", "Miller"],
    ["Frank", "Wilson"],
  ]
  const tProfiles = []
  for (const [f, l] of tNames) {
    tProfiles.push(
      await prisma.profile.create({
        data: {
          id: u(),
          school: { connect: { id: school.id } },
          branch: { connect: { id: b1.id } },
          role: "TEACHER",
          firstName: f,
          lastName: l,
        },
      }),
    )
  }
  const stNames = [
    ["Grace", "Lee"],
    ["Henry", "Clark"],
    ["Iris", "Lewis"],
    ["Jack", "Hall"],
  ]
  const sProfiles = []
  for (const [f, l] of stNames) {
    sProfiles.push(
      await prisma.profile.create({
        data: {
          id: u(),
          school: { connect: { id: school.id } },
          branch: { connect: { id: b1.id } },
          role: "PRINCIPAL",
          firstName: f,
          lastName: l,
        },
      }),
    )
  }
  const acctProfile = await prisma.profile.create({
    data: {
      id: u(),
      school: { connect: { id: school.id } },
      branch: { connect: { id: b1.id } },
      role: "ACCOUNTANT",
      firstName: "Karen",
      lastName: "Young",
    },
  })
  const adminTP = await prisma.profile.create({
    data: {
      id: u(),
      school: { connect: { id: school.id } },
      branch: { connect: { id: b1.id } },
      role: "TEACHER",
      firstName: "Admin",
      lastName: "Teacher",
    },
  })
  console.log("Profiles created")

  // ── Classes & Sections ──
  const classNames = [
    "Nursery",
    "KG 1",
    "KG 2",
    "Grade 1",
    "Grade 2",
    "Grade 3",
    "Grade 4",
    "Grade 5",
    "Grade 6",
    "Grade 7",
    "Grade 8",
  ]
  const cls = []
  for (let i = 0; i < classNames.length; i++) {
    cls.push(
      await prisma.class.create({
        data: {
          id: u(),
          school: { connect: { id: school.id } },
          branch: { connect: { id: b1.id } },
          name: classNames[i],
          code: `C${String(i + 1).padStart(2, "0")}`,
          order: i + 1,
        },
      }),
    )
  }
  const secs: { id: string; classId: string; name: string }[] = []
  for (const c of cls) {
    for (const sn of ["A", "B"]) {
      secs.push(
        await prisma.section.create({
          data: { id: u(), class: { connect: { id: c.id } }, name: sn, capacity: 30 },
        }),
      )
    }
  }
  console.log(`Classes: ${cls.length}, Sections: ${secs.length}`)

  // ── Subjects ──
  const subDefs = [
    ["English", "ENG", "CORE"],
    ["Mathematics", "MATH", "CORE"],
    ["Science", "SCI", "CORE"],
    ["Social Studies", "SST", "CORE"],
    ["Hindi", "HIN", "CORE"],
    ["Computer Science", "CS", "ELECTIVE"],
    ["Art & Craft", "ART", "ELECTIVE"],
    ["Physical Education", "PE", "ELECTIVE"],
    ["Music", "MUS", "ELECTIVE"],
    ["General Knowledge", "GK", "ELECTIVE"],
  ] as const
  const subs = []
  for (const [name, code, type] of subDefs) {
    subs.push(
      await prisma.subject.create({
        data: {
          id: u(),
          school: { connect: { id: school.id } },
          branch: { connect: { id: b1.id } },
          name,
          code,
          type,
        },
      }),
    )
  }
  console.log(`Subjects: ${subs.length}`)

  // ── ClassSubject ──
  for (const c of cls.slice(3, 8)) {
    for (const s of subs.slice(0, 6)) {
      await prisma.classSubject
        .create({
          data: { id: u(), class: { connect: { id: c.id } }, subject: { connect: { id: s.id } } },
        })
        .catch(() => {})
    }
  }

  // ── Teachers ──
  const teachers = []
  for (let i = 0; i < tProfiles.length; i++) {
    teachers.push(
      await prisma.teacher.create({
        data: {
          id: u(),
          school: { connect: { id: school.id } },
          branch: { connect: { id: b1.id } },
          profile: { connect: { id: tProfiles[i].id } },
          employeeCode: `T${String(i + 1).padStart(3, "0")}`,
          firstName: tProfiles[i].firstName!,
          lastName: tProfiles[i].lastName!,
          qualification: "M.Sc",
          specialization: ["Math", "English", "Science", "Hindi", "Social Studies", "CS"][i],
          joiningDate: ago(700 - i * 30),
        },
      }),
    )
  }
  const adminT = await prisma.teacher.create({
    data: {
      id: u(),
      school: { connect: { id: school.id } },
      branch: { connect: { id: b1.id } },
      profile: { connect: { id: adminTP.id } },
      employeeCode: "T000",
      firstName: "Admin",
      lastName: "Teacher",
      qualification: "M.Ed",
      specialization: "Admin",
      joiningDate: ago(1000),
    },
  })
  teachers.push(adminT)
  console.log(`Teachers: ${teachers.length}`)

  // ── Staff ──
  const staffRecs = []
  for (let i = 0; i < sProfiles.length; i++) {
    staffRecs.push(
      await prisma.staff.create({
        data: {
          id: u(),
          school: { connect: { id: school.id } },
          branch: { connect: { id: b1.id } },
          profile: { connect: { id: sProfiles[i].id } },
          employeeCode: `S${String(i + 1).padStart(3, "0")}`,
          firstName: sProfiles[i].firstName!,
          lastName: sProfiles[i].lastName!,
          department: ["Admin", "Finance", "IT", "Maintenance"][i],
          designation: ["Office Mgr", "Accountant", "IT Support", "Facility Mgr"][i],
          joiningDate: ago(900 - i * 60),
        },
      }),
    )
  }
  console.log(`Staff: ${staffRecs.length}`)

  // ── Students ──
  const fns = [
    "Aarav",
    "Vivaan",
    "Aditya",
    "Vihaan",
    "Arjun",
    "Sai",
    "Reyansh",
    "Krishna",
    "Ishaan",
    "Shaurya",
    "Ananya",
    "Diya",
    "Priya",
    "Nisha",
    "Kavya",
    "Aanya",
    "Riya",
    "Saanvi",
    "Myra",
    "Pihu",
    "Rohan",
    "Siddharth",
    "Nikhil",
    "Karan",
    "Rahul",
    "Meera",
    "Tara",
    "Naina",
    "Simran",
    "Pooja",
    "Harsh",
    "Dhruv",
    "Manav",
    "Deepak",
    "Aakash",
    "Divya",
    "Sakshi",
    "Aarti",
    "Komal",
    "Rina",
    "Yash",
    "Tarun",
    "Gaurav",
    "Mohit",
    "Amit",
    "Sunita",
    "Renu",
    "Geeta",
    "Suman",
    "Lata",
  ]
  const lns = [
    "Sharma",
    "Verma",
    "Gupta",
    "Singh",
    "Kumar",
    "Patel",
    "Reddy",
    "Nair",
    "Iyer",
    "Das",
    "Joshi",
    "Mishra",
    "Tiwari",
    "Chauhan",
    "Rao",
    "Mehta",
    "Shah",
    "Chopra",
    "Malhotra",
    "Kapoor",
  ]
  const bgs = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]
  const stds = []
  for (let i = 0; i < fns.length; i++) {
    const ci = Math.floor(i / 5) % cls.length
    const classSecs = secs.filter((s) => s.classId === cls[ci].id)
    stds.push(
      await prisma.student.create({
        data: {
          id: u(),
          school: { connect: { id: school.id } },
          branch: { connect: { id: b1.id } },
          firstName: fns[i],
          lastName: lns[i % lns.length],
          dateOfBirth: new Date(2012 + (i % 8), i % 12, (i % 28) + 1),
          gender: (i % 2 === 0 ? "MALE" : "FEMALE") as any,
          bloodGroup: bgs[i % bgs.length],
          religion: ["Hindu", "Muslim", "Christian", "Sikh"][i % 4],
          nationality: "Indian",
          admissionNo: `ADM${String(i + 1).padStart(4, "0")}`,
          admissionDate: ago(700 - (i % 10) * 30),
        },
      }),
    )
  }
  console.log(`Students: ${stds.length}`)

  // ── Enrollments + Parents (batch SQL) ──
  const enrVals: string[] = []
  for (let i = 0; i < stds.length; i++) {
    const ci = Math.floor(i / 5) % cls.length
    const classSecs = secs.filter((s) => s.classId === cls[ci].id)
    enrVals.push(
      `('${u()}','${stds[i].id}','${cls[ci].id}','${classSecs[i % classSecs.length].id}','${s1.id}','${String(i + 1)}','${new Date().toISOString().split("T")[0]}','ACTIVE',NOW(),NOW())`,
    )
  }
  if (enrVals.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO student_enrollments (id,student_id,class_id,section_id,academic_session_id,roll_number,enrollment_date,status,created_at,updated_at) VALUES ${enrVals.join(",")}`,
    )

  const parVals: string[] = []
  const spVals: string[] = []
  const parentRecs: { id: string }[] = []
  for (let i = 0; i < 25; i++) {
    const pid = u()
    parentRecs.push({ id: pid })
    parVals.push(
      `('${pid}','${school.id}','${lns[i % lns.length]} Sr.','${lns[i % lns.length]}','${["FATHER", "MOTHER", "GUARDIAN"][i % 3]}','+1-555-${3000 + i}','parent${i + 1}@greenwood.edu','${["Engineer", "Doctor", "Teacher", "Business", "Lawyer"][i % 5]}',NULL,true,NOW(),NOW())`,
    )
    spVals.push(`('${stds[i].id}','${pid}')`)
  }
  if (parVals.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO parents (id,school_id,first_name,last_name,relationship,phone,email,occupation,address,is_primary,created_at,updated_at) VALUES ${parVals.join(",")}`,
    )
  if (spVals.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO student_parents (student_id,parent_id) VALUES ${spVals.join(",")}`,
    )
  console.log(`Parents: ${parentRecs.length}`)

  // ── Leave Requests (batch SQL) ──
  const lp = [tProfiles[0], sProfiles[0], adminTP]
  const lrVals: string[] = []
  for (let i = 0; i < lp.length; i++) {
    lrVals.push(
      `('${u()}','${lp[i].id}','${["SICK", "CASUAL", "ANNUAL"][i]}','${
        ago(10 + i * 5)
          .toISOString()
          .split("T")[0]
      }','${
        ago(8 + i * 5)
          .toISOString()
          .split("T")[0]
      }','Personal reason','${["PENDING", "APPROVED", "REJECTED"][i]}',${i > 0 ? `'${ADMIN_ID}'` : "NULL"},NOW(),NOW())`,
    )
  }
  if (lrVals.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO leave_requests (id,profile_id,leave_type,start_date,end_date,reason,status,approved_by,created_at,updated_at) VALUES ${lrVals.join(",")}`,
    )

  // ── Teacher Assignments (batch SQL) ──
  const taVals: string[] = []
  for (const t of teachers.slice(0, 5)) {
    for (const c of cls.slice(3, 6)) {
      taVals.push(
        `('${u()}','${t.id}','${c.id}',NULL,'${subs[Math.floor(Math.random() * 5)].id}','${s1.id}',NOW())`,
      )
    }
  }
  if (taVals.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO teacher_assignments (id,teacher_id,class_id,section_id,subject_id,academic_session_id,created_at) VALUES ${taVals.join(",")}`,
    )

  // ── Exam Types + Exams (batch SQL) ──
  const etDefs = [
    { n: "Unit Test 1", w: 1 },
    { n: "Mid Term", w: 2 },
    { n: "Unit Test 2", w: 1 },
    { n: "Final Exam", w: 3 },
  ]
  const etIds: string[] = []
  const etVals: string[] = []
  for (const e of etDefs) {
    const eid = u()
    etIds.push(eid)
    etVals.push(`('${eid}','${school.id}','${b1.id}','${e.n}',NULL,${e.w},true,NOW(),NOW())`)
  }
  if (etVals.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO exam_types (id,school_id,branch_id,name,description,weight,is_active,created_at,updated_at) VALUES ${etVals.join(",")}`,
    )

  const exIds: string[] = []
  const exVals: string[] = []
  const exSchVals: string[] = []
  for (let ei = 0; ei < etIds.length; ei++) {
    for (const c of cls.slice(3, 7)) {
      for (const sub of subs.slice(0, 4)) {
        const eid = u()
        exIds.push(eid)
        exVals.push(
          `('${eid}','${school.id}','${b1.id}','${etIds[ei]}','${c.id}','${sub.id}','${s1.id}','${etDefs[ei].n} - ${c.name} - ${sub.name}',100,33,'${ago(60).toISOString().split("T")[0]}','09:00','11:00',true,NOW(),NOW())`,
        )
        exSchVals.push(
          `('${u()}','${eid}','Room ${Math.floor(Math.random() * 10) + 1}','${ago(60).toISOString().split("T")[0]}','09:00','11:00',NULL,NOW(),NOW())`,
        )
      }
    }
  }
  if (exVals.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO exams (id,school_id,branch_id,exam_type_id,class_id,subject_id,academic_session_id,name,total_marks,passing_marks,exam_date,start_time,end_time,is_published,created_at,updated_at) VALUES ${exVals.join(",")}`,
    )
  if (exSchVals.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO exam_schedules (id,exam_id,room,date,start_time,end_time,notes,created_at,updated_at) VALUES ${exSchVals.join(",")}`,
    )
  console.log(`Exam types: ${etIds.length}, Exams: ${exIds.length}`)

  // ── Exam Results (batch SQL) ──
  const erValues: string[] = []
  for (const exId of exIds.slice(0, 20)) {
    for (let i = 0; i < Math.min(stds.length, 15); i++) {
      const m = Math.floor(Math.random() * 40) + 60
      const g = m >= 90 ? "A_PLUS" : m >= 80 ? "A" : m >= 70 ? "B_PLUS" : m >= 60 ? "B" : "C_PLUS"
      const r = m >= 80 ? "Excellent" : "Good"
      erValues.push(
        `('${u()}','${exId}','${stds[i].id}',${m},'${g}','${r}','${tProfiles[0].id}','${ago(50).toISOString()}',NOW(),NOW())`,
      )
    }
  }
  if (erValues.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO exam_results (id,exam_id,student_id,marks_obtained,grade,remarks,graded_by,graded_at,created_at,updated_at) VALUES ${erValues.join(",")}`,
    )
  console.log(`Exam results: ${erValues.length}`)

  // ── Fee Structures ──
  const fsDefs = [
    { name: "Tuition Fee", amount: "5000", frequency: "MONTHLY", category: "TUITION" },
    { name: "Admission Fee", amount: "10000", frequency: "ONE_TIME", category: "ADMISSION" },
    { name: "Lab Fee", amount: "2000", frequency: "QUARTERLY", category: "LAB" },
    { name: "Library Fee", amount: "500", frequency: "YEARLY", category: "LIBRARY" },
    { name: "Sports Fee", amount: "1500", frequency: "YEARLY", category: "SPORTS" },
    { name: "Transport Fee", amount: "3000", frequency: "MONTHLY", category: "TRANSPORT" },
  ]
  const fStructs = []
  for (const f of fsDefs) {
    fStructs.push(
      await prisma.feeStructure.create({
        data: {
          id: u(),
          school: { connect: { id: school.id } },
          branch: { connect: { id: b1.id } },
          ...f,
        },
      }),
    )
  }

  // ── Fee Plans + Invoices + Payments (batch SQL) ──
  const fpVals: string[] = []
  for (const st of stds.slice(0, 20)) {
    for (const fs of fStructs.slice(0, 3)) {
      fpVals.push(`('${u()}','${st.id}','${fs.id}','${s1.id}',NULL,NULL,true,NOW(),NOW())`)
    }
  }
  if (fpVals.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO student_fee_plans (id,student_id,fee_structure_id,academic_session_id,discount_type,discount_value,is_active,created_at,updated_at) VALUES ${fpVals.join(",")}`,
    )

  const invVals: string[] = []
  const invItemVals: string[] = []
  let invIdx = 0
  for (const st of stds.slice(0, 15)) {
    for (const fs of fStructs.slice(0, 2)) {
      invIdx++
      const invId = u()
      const status = invIdx % 3 === 0 ? "PAID" : invIdx % 3 === 1 ? "PARTIAL" : "PENDING"
      invVals.push(
        `('${invId}','${st.id}','${s1.id}','INV-2026-${String(invIdx).padStart(5, "0")}','${ago(30).toISOString().split("T")[0]}','${fromNow(15).toISOString().split("T")[0]}','${fs.amount}',0,0,'${status}',0,NULL,NOW(),NOW())`,
      )
      invItemVals.push(`('${u()}','${invId}','${fs.id}','${fs.amount}',NOW())`)
    }
  }
  if (invVals.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO fee_invoices (id,student_id,academic_session_id,invoice_number,invoice_date,due_date,total_amount,discount_amount,paid_amount,status,late_fee,notes,created_at,updated_at) VALUES ${invVals.join(",")}`,
    )
  if (invItemVals.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO fee_invoice_items (id,invoice_id,fee_structure_id,amount,created_at) VALUES ${invItemVals.join(",")}`,
    )

  const paidInvs = await prisma.feeInvoice.findMany({
    where: { status: { in: ["PAID", "PARTIAL"] } },
  })
  const payVals: string[] = []
  for (let i = 0; i < paidInvs.length; i++) {
    payVals.push(
      `('${u()}','${paidInvs[i].id}','RCPT-2026-${String(i + 1).padStart(5, "0")}','${paidInvs[i].totalAmount}','${ago(20).toISOString().split("T")[0]}','${["CASH", "BANK_TRANSFER", "ONLINE"][i % 3]}','${acctProfile.id}',NOW())`,
    )
  }
  if (payVals.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO payments (id,invoice_id,receipt_number,amount,payment_date,payment_mode,recorded_by,created_at) VALUES ${payVals.join(",")}`,
    )
  console.log(
    `Fee structures: ${fStructs.length}, Invoices: ${invIdx}, Payments: ${paidInvs.length}`,
  )

  // ── Expenses (batch) ──
  const expCats = [
    "Electricity",
    "Water Bill",
    "Maintenance",
    "Office Supplies",
    "Salary",
    "Lab Equipment",
    "Sports Equipment",
    "Cleaning",
    "Internet",
    "Insurance",
  ]
  const expValues: string[] = []
  for (let i = 0; i < 15; i++) {
    const amt = Math.floor(Math.random() * 5000) + 500
    expValues.push(
      `('${u()}','${school.id}','${b1.id}','${expCats[i % expCats.length]}',${amt},'${expCats[i % expCats.length]} payment','${
        ago(i * 5)
          .toISOString()
          .split("T")[0]
      }','${acctProfile.id}',NOW())`,
    )
  }
  if (expValues.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO expenses (id,school_id,branch_id,category,amount,description,expense_date,recorded_by,created_at) VALUES ${expValues.join(",")}`,
    )

  // ── Homework (batch SQL) ──
  const hwVals: string[] = []
  for (let i = 0; i < 20; i++) {
    hwVals.push(
      `('${u()}','${school.id}','${b1.id}','${cls[i % cls.length].id}','${subs[i % subs.length].id}','${teachers[i % teachers.length].id}','${s1.id}','HW-${i + 1}: ${subs[i % subs.length].name} Assignment','Complete exercises from chapter ${i + 1}.','${
        fromNow(7 - (i % 10))
          .toISOString()
          .split("T")[0]
      }',20,true,NOW(),NOW())`,
    )
  }
  if (hwVals.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO homework (id,school_id,branch_id,class_id,subject_id,teacher_id,academic_session_id,title,description,due_date,total_marks,is_active,created_at,updated_at) VALUES ${hwVals.join(",")}`,
    )
  const hws = await prisma.homework.findMany({ orderBy: { createdAt: "desc" }, take: 20 })

  const subVals: string[] = []
  for (const hw of hws.slice(0, 10)) {
    for (const st of stds.slice(0, 8)) {
      const m = Math.floor(Math.random() * 8) + 12
      subVals.push(
        `('${u()}','${hw.id}','${st.id}','Completed',${m},'Good work!','GRADED','${ago(2).toISOString()}',NOW(),NOW())`,
      )
    }
  }
  if (subVals.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO homework_submissions (id,homework_id,student_id,content,marks_obtained,feedback,status,graded_at,created_at,updated_at) VALUES ${subVals.join(",")}`,
    )
  console.log(`Homework: ${hws.length}, Submissions: ${subVals.length}`)

  // ── Announcements (batch SQL) ──
  const annDefs = [
    { title: "Annual Day Celebration", content: "Annual day on Dec 20th.", audience: "ALL" },
    {
      title: "PTM Scheduled",
      content: "Parent-Teacher Meeting next Saturday.",
      audience: "PARENTS",
    },
    { title: "Science Exhibition", content: "Prepare your projects.", audience: "STUDENTS" },
    { title: "Staff Training", content: "Digital teaching tools workshop.", audience: "TEACHERS" },
    { title: "Holiday Notice", content: "School closed on Republic Day.", audience: "ALL" },
  ]
  const annVals: string[] = []
  for (let i = 0; i < annDefs.length; i++) {
    const a = annDefs[i]
    annVals.push(
      `('${u()}','${school.id}','${b1.id}','${tProfiles[0].id}','${a.title.replace(/'/g, "''")}','${a.content.replace(/'/g, "''")}','${a.audience}',true,'${ago(10 - i * 2).toISOString()}',NOW(),NOW())`,
    )
  }
  if (annVals.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO announcements (id,school_id,branch_id,author_id,title,content,audience,is_published,published_at,created_at,updated_at) VALUES ${annVals.join(",")}`,
    )

  // ── Library (batch SQL) ──
  const bookDefs = [
    {
      t: "Mathematics for Class 5",
      a: "R.D. Sharma",
      i: "978-81-12345-01-0",
      c: "Mathematics",
      q: 10,
    },
    { t: "English Grammar", a: "Wren & Martin", i: "978-81-12345-02-7", c: "English", q: 8 },
    { t: "Science Explorer", a: "NCERT", i: "978-81-12345-03-4", c: "Science", q: 12 },
    { t: "Social Studies", a: "NCERT", i: "978-81-12345-04-1", c: "Social Studies", q: 7 },
    { t: "Hindi Kavya", a: "Ramdhari Singh Dinkar", i: "978-81-12345-05-8", c: "Hindi", q: 6 },
    { t: "Story of My Life", a: "Helen Keller", i: "978-81-12345-06-5", c: "Biography", q: 5 },
    { t: "Computer Basics", a: "Let Us C", i: "978-81-12345-07-2", c: "Computer", q: 9 },
    { t: "General Knowledge", a: "Manorama", i: "978-81-12345-08-9", c: "GK", q: 4 },
    { t: "Environmental Studies", a: "NCERT", i: "978-81-12345-09-6", c: "EVS", q: 11 },
    { t: "Art & Creativity", a: "Ruskin Bond", i: "978-81-12345-10-2", c: "Art", q: 3 },
  ]
  const bookIds: string[] = []
  const bkVals: string[] = []
  for (const b of bookDefs) {
    const bid = u()
    bookIds.push(bid)
    bkVals.push(
      `('${bid}','${school.id}','${b1.id}','${b.t.replace(/'/g, "''")}','${b.a.replace(/'/g, "''")}','${b.i}','${b.c}',${b.q},${b.q},'Shelf A',true,NOW(),NOW())`,
    )
  }
  if (bkVals.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO library_books (id,school_id,branch_id,title,author,isbn,category,quantity,available,location,is_active,created_at,updated_at) VALUES ${bkVals.join(",")}`,
    )

  const biVals: string[] = []
  for (let i = 0; i < 10; i++) {
    const retDate = i < 5 ? `'${ago(2).toISOString().split("T")[0]}'` : "NULL"
    biVals.push(
      `('${u()}','${bookIds[i % bookIds.length]}','${stds[i].id}','${
        ago(15 - i)
          .toISOString()
          .split("T")[0]
      }','${
        fromNow(7 - i)
          .toISOString()
          .split("T")[0]
      }',${retDate},0,false,'${i < 5 ? "RETURNED" : "ISSUED"}',NULL,NOW(),NOW())`,
    )
  }
  if (biVals.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO book_issues (id,book_id,student_id,issue_date,due_date,return_date,fine_amount,fine_paid,status,notes,created_at,updated_at) VALUES ${biVals.join(",")}`,
    )
  console.log(`Books: ${bookIds.length}`)

  // ── Transport (batch SQL) ──
  const vehDefs = [
    { p: "BUS-001", t: "Bus", c: 40, d: "Ramesh", dp: "+1-555-4001" },
    { p: "BUS-002", t: "Bus", c: 40, d: "Suresh", dp: "+1-555-4002" },
    { p: "VAN-001", t: "Van", c: 12, d: "Mahesh", dp: "+1-555-4003" },
    { p: "VAN-002", t: "Van", c: 8, d: "Ganesh", dp: "+1-555-4004" },
  ]
  const vehIds: string[] = []
  const vVals: string[] = []
  for (const v of vehDefs) {
    const vid = u()
    vehIds.push(vid)
    vVals.push(
      `('${vid}','${school.id}','${b1.id}','${v.p}','${v.t}',${v.c},'${v.d}','${v.dp}',true,NOW(),NOW())`,
    )
  }
  if (vVals.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO vehicles (id,school_id,branch_id,plate_number,vehicle_type,capacity,driver_name,driver_phone,is_active,created_at,updated_at) VALUES ${vVals.join(",")}`,
    )

  const routeDefs = [
    {
      n: "Route A - Downtown",
      s: "City Center",
      e: "School",
      st: "Bus Stand,Market Road",
      pt: "07:30",
      dt: "15:30",
      mf: "2000",
    },
    {
      n: "Route B - Uptown",
      s: "North Colony",
      e: "School",
      st: "Hospital,Temple",
      pt: "07:45",
      dt: "15:45",
      mf: "2500",
    },
    {
      n: "Route C - East",
      s: "East Wing",
      e: "School",
      st: "Station,Mall",
      pt: "07:15",
      dt: "15:15",
      mf: "2200",
    },
  ]
  const routeIds: string[] = []
  const rVals: string[] = []
  for (let i = 0; i < routeDefs.length; i++) {
    const rid = u()
    routeIds.push(rid)
    const r = routeDefs[i]
    rVals.push(
      `('${rid}','${school.id}','${b1.id}','${vehIds[i]}','${r.n}','${r.s}','${r.e}','${r.st}','${r.pt}','${r.dt}','${r.mf}',true,NOW(),NOW())`,
    )
  }
  if (rVals.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO transport_routes (id,school_id,branch_id,vehicle_id,name,start_location,end_location,stops,pickup_time,drop_time,monthly_fee,is_active,created_at,updated_at) VALUES ${rVals.join(",")}`,
    )

  const stVals: string[] = []
  for (let i = 0; i < 12; i++) {
    stVals.push(
      `('${u()}','${stds[i].id}','${routeIds[i % routeIds.length]}','${vehIds[i % vehIds.length]}','${s1.id}','${ago(0).toISOString().split("T")[0]}',NULL,true,NOW(),NOW())`,
    )
  }
  if (stVals.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO student_transport (id,student_id,route_id,vehicle_id,academic_session_id,start_date,end_date,is_active,created_at,updated_at) VALUES ${stVals.join(",")}`,
    )
  console.log(`Vehicles: ${vehIds.length}, Routes: ${routeIds.length}`)

  // ── Timetable (batch via raw SQL) ──
  const days: Array<"MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY"> = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ]
  const periods = [
    { start: "08:00", end: "08:45" },
    { start: "08:45", end: "09:30" },
    { start: "09:45", end: "10:30" },
    { start: "10:30", end: "11:15" },
    { start: "11:30", end: "12:15" },
    { start: "12:15", end: "13:00" },
  ]
  const ttValues: string[] = []
  for (const c of cls.slice(3, 7)) {
    for (const day of days) {
      for (let p = 0; p < 6; p++) {
        const id = u(),
          subId = subs[p % subs.length].id,
          teachId = teachers[p % teachers.length].id
        ttValues.push(
          `('${id}','${school.id}','${b1.id}','${c.id}','${subId}','${teachId}','${s1.id}','${day}','${periods[p].start}','${periods[p].end}','Room ${c.order}',NOW(),NOW())`,
        )
      }
    }
  }
  if (ttValues.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO timetables (id,school_id,branch_id,class_id,subject_id,teacher_id,academic_session_id,day_of_week,start_time,end_time,room,created_at,updated_at) VALUES ${ttValues.join(",")}`,
    )
  console.log(`Timetable: ${ttValues.length} slots`)

  // ── Student Attendance (batch via raw SQL) ──
  const attValues: string[] = []
  for (let d = 0; d < 15; d++) {
    const date = ago(d)
    if (date.getDay() === 0) continue
    const ds = date.toISOString().split("T")[0]
    for (let i = 0; i < Math.min(stds.length, 15); i++) {
      const statuses = ["PRESENT", "PRESENT", "PRESENT", "ABSENT", "LATE"]
      const st = statuses[Math.floor(Math.random() * statuses.length)]
      attValues.push(
        `('${u()}','${stds[i].id}','${cls[i % cls.length].id}','${s1.id}','${ds}','${st}','${adminTP.id}',NOW(),NOW())`,
      )
    }
  }
  if (attValues.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO student_attendance (id,student_id,class_id,academic_session_id,date,status,marked_by_id,created_at,updated_at) VALUES ${attValues.join(",")}`,
    )
  console.log(`Student attendance: ${attValues.length} records`)

  // ── Staff Attendance (batch via raw SQL) ──
  const saValues: string[] = []
  for (const st of staffRecs) {
    for (let d = 0; d < 10; d++) {
      const date = ago(d)
      if (date.getDay() === 0) continue
      const ds = date.toISOString().split("T")[0]
      const ci = `${ds}T09:00:00.000Z`,
        co = `${ds}T17:00:00.000Z`
      saValues.push(
        `('${u()}','${st.id}','${ds}','${ci}','${co}','${Math.random() > 0.1 ? "PRESENT" : "ABSENT"}',NOW())`,
      )
    }
  }
  if (saValues.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO staff_attendance (id,staff_id,date,check_in,check_out,status,created_at) VALUES ${saValues.join(",")}`,
    )
  console.log(`Staff attendance: ${saValues.length} records`)

  // ── Messages (batch SQL) ──
  const msgVals: string[] = []
  for (let i = 0; i < 10; i++) {
    msgVals.push(
      `('${u()}','${school.id}','${tProfiles[i % tProfiles.length].id}','${tProfiles[(i + 1) % tProfiles.length].id}','Message ${i + 1}','Message ${i + 1} regarding school activities.',${i < 5},NULL,NOW())`,
    )
  }
  if (msgVals.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO messages (id,school_id,sender_id,receiver_id,subject,content,is_read,read_at,created_at) VALUES ${msgVals.join(",")}`,
    )

  // ── Notifications (batch SQL) ──
  const notiVals: string[] = []
  const notiTypes = ["INFO", "WARNING", "SUCCESS", "ERROR"]
  const notiTopics = ["new student", "fee payment", "exam result", "attendance", "announcement"]
  for (let i = 0; i < 15; i++) {
    notiVals.push(
      `('${u()}','${ADMIN_ID}','Notification ${i + 1}','About ${notiTopics[i % 5]}.','${notiTypes[i % 4]}',${i < 8},NULL,'/dashboard',NOW())`,
    )
  }
  if (notiVals.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO notifications (id,user_id,title,content,type,is_read,read_at,link,created_at) VALUES ${notiVals.join(",")}`,
    )

  // ── Audit Logs (batch SQL) ──
  const acts = ["CREATE", "UPDATE", "DELETE", "LOGIN", "PAYMENT"]
  const ents = ["Student", "Teacher", "FeeInvoice", "Class", "Expense"]
  const alVals: string[] = []
  for (let i = 0; i < 20; i++) {
    alVals.push(
      `('${u()}','${ADMIN_ID}','${school.id}','${b1.id}','${acts[i % acts.length]}','${ents[i % ents.length]}',NULL,'{"detail":"Audit entry ${i + 1}"}',NOW())`,
    )
  }
  if (alVals.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO audit_logs (id,user_id,school_id,branch_id,action,entity_type,entity_id,new_values,created_at) VALUES ${alVals.join(",")}`,
    )

  console.log("Messages, notifications, audit logs created")

  // ── Calendar Events (batch SQL) ──
  const calEventTypes = ["HOLIDAY", "EXAM", "EVENT", "MEETING", "ACADEMIC_SESSION", "OTHER"]
  const calEventTitles = [
    "Independence Day",
    "Summer Break",
    "Winter Vacation",
    "Mid Term Exams",
    "Final Exams",
    "Science Fair",
    "Sports Day",
    "Annual Day",
    "Staff Meeting",
    "PTM",
    "Diwali Break",
    "Holiday - Eid",
  ]
  const ceVals: string[] = []
  for (let i = 0; i < 15; i++) {
    const start = fromNow(-5 + i * 7)
    const end = fromNow(-3 + i * 7)
    ceVals.push(
      `('${u()}','${school.id}','${b1.id}','${calEventTitles[i % calEventTitles.length].replace(/'/g, "''")}','Description for ${calEventTitles[i % calEventTitles.length]}','${calEventTypes[i % calEventTypes.length]}','${start.toISOString().split("T")[0]}','${end.toISOString().split("T")[0]}',true,NULL,NULL,NULL,NULL,'${ADMIN_ID}',NOW(),NOW())`,
    )
  }
  if (ceVals.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO calendar_events (id,school_id,branch_id,title,description,event_type,start_date,end_date,is_all_day,start_time,end_time,color,academic_session_id,created_by_id,created_at,updated_at) VALUES ${ceVals.join(",")}`,
    )
  console.log(`Calendar events: ${ceVals.length}`)

  // ── Meetings (batch SQL) ──
  const meetingTypes = ["PARENT_TEACHER", "STAFF", "DEPARTMENT"]
  const meetingStatuses = ["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED"]
  const meetingVals: string[] = []
  const meetingIds: string[] = []
  for (let i = 0; i < 8; i++) {
    const mid = u()
    meetingIds.push(mid)
    const start = fromNow(-10 + i * 3)
    const end = fromNow(-10 + i * 3)
    end.setHours(end.getHours() + 1)
    meetingVals.push(
      `('${mid}','${school.id}','${b1.id}','${["Parent-Teacher Meeting", "Staff Planning", "Department Review", "Curriculum Meeting", "Budget Review", "Committee Meeting", "Training Session", "All-Hands Meeting"][i]}','Description for meeting ${i + 1}','${meetingTypes[i % meetingTypes.length]}','${start.toISOString()}','${end.toISOString()}','Room ${100 + i}','${meetingStatuses[i % meetingStatuses.length]}','${ADMIN_ID}',NOW(),NOW())`,
    )
  }
  if (meetingVals.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO meetings (id,school_id,branch_id,title,description,meeting_type,start_date_time,end_date_time,location,status,created_by_id,created_at,updated_at) VALUES ${meetingVals.join(",")}`,
    )
  console.log(`Meetings: ${meetingIds.length}`)

  // ── Meeting Attendees (batch SQL) ──
  const allProfileIds = [
    ADMIN_ID,
    ...tProfiles.map((p) => p.id),
    ...sProfiles.map((p) => p.id),
    acctProfile.id,
    adminTP.id,
  ]
  const attVals: string[] = []
  for (const mid of meetingIds) {
    const selectedProfiles = allProfileIds.sort(() => Math.random() - 0.5).slice(0, 3)
    for (const pid of selectedProfiles) {
      const attStatus = ["PENDING", "ACCEPTED", "DECLINED", "TENTATIVE"]
      attVals.push(
        `('${u()}','${mid}','${pid}','${attStatus[Math.floor(Math.random() * attStatus.length)]}',NOW())`,
      )
    }
  }
  if (attVals.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO meeting_attendees (id,meeting_id,profile_id,status,created_at) VALUES ${attVals.join(",")}`,
    )
  console.log(`Meeting attendees: ${attVals.length}`)

  // ── Meeting Notes (batch SQL) ──
  const noteVals: string[] = []
  for (const mid of meetingIds.slice(0, 4)) {
    noteVals.push(
      `('${u()}','${mid}','${ADMIN_ID}','Discussed agenda items and action points for next steps.',NOW())`,
    )
  }
  if (noteVals.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO meeting_notes (id,meeting_id,author_id,content,created_at) VALUES ${noteVals.join(",")}`,
    )
  console.log(`Meeting notes: ${noteVals.length}`)

  // ── Events (batch SQL) ──
  const eventTypes = ["SCHOOL", "BRANCH", "CLASS"]
  const eventStatuses = ["DRAFT", "PUBLISHED", "COMPLETED", "CANCELLED"]
  const eventTitles = [
    "Science Exhibition",
    "Art Competition",
    "Sports Tournament",
    "Debate Competition",
    "Cultural Fest",
    "Workshop",
    "Seminar",
    "Field Trip",
  ]
  const eventLocations = [
    "Auditorium",
    "Playground",
    "Science Lab",
    "Library",
    "Main Hall",
    "Campus Grounds",
    "Online (Google Meet)",
    "Room 101",
  ]
  const eventVals: string[] = []
  const eventIds: string[] = []
  for (let i = 0; i < 8; i++) {
    const eid = u()
    eventIds.push(eid)
    const start = fromNow(-5 + i * 7)
    const end = fromNow(-4 + i * 7)
    eventVals.push(
      `('${eid}','${school.id}','${b1.id}','${eventTitles[i]}','Description for ${eventTitles[i]}','${eventTypes[i % eventTypes.length]}','${start.toISOString()}','${end.toISOString()}','${eventLocations[i]}',${i % 2 === 0},${20 + i * 5},'${eventStatuses[i % eventStatuses.length]}','${ADMIN_ID}',NOW(),NOW())`,
    )
  }
  if (eventVals.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO events (id,school_id,branch_id,title,description,event_type,start_date_time,end_date_time,location,is_registration_required,max_participants,status,created_by_id,created_at,updated_at) VALUES ${eventVals.join(",")}`,
    )
  console.log(`Events: ${eventIds.length}`)

  // ── Event Registrations (batch SQL) ──
  const regVals: string[] = []
  for (const eid of eventIds.slice(0, 5)) {
    const selectedProfiles = allProfileIds.sort(() => Math.random() - 0.5).slice(0, 3)
    for (const pid of selectedProfiles) {
      regVals.push(`('${u()}','${eid}','${pid}',NOW())`)
    }
  }
  if (regVals.length)
    await prisma.$executeRawUnsafe(
      `INSERT INTO event_registrations (id,event_id,profile_id,created_at) VALUES ${regVals.join(",")}`,
    )
  console.log(`Event registrations: ${regVals.length}`)

  console.log("\n✅ Seeding complete!")
  console.log("Login: superadmin@school.com / Super@123456")
}

main()
  .catch((e) => {
    console.error("Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
