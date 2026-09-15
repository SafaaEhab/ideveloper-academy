import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { getDb, getStudentByCode, listGroups, listStudents, createAccessCode } from "./db";
import { groups, students, studentCourses } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const courseSchema = z.enum(["Scratch", "Robotics", "Web", "Python"]);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  portal: router({
    byCode: publicProcedure.input(z.object({ accessCode: z.string().min(4) })).query(({ input }) => getStudentByCode(input.accessCode)),
  }),
  admin: router({
    stats: adminProcedure.query(async () => {
      const [studentRows, groupRows] = await Promise.all([listStudents(), listGroups()]);
      return { students: studentRows.length, groups: groupRows.length, active: studentRows.filter(s => s.status === "active").length };
    }),
    students: adminProcedure.query(() => listStudents()),
    groups: adminProcedure.query(() => listGroups()),
    createGroup: adminProcedure.input(z.object({ name: z.string().min(2), level: z.string().optional(), scheduleDays: z.string().optional(), scheduleTime: z.string().optional() })).mutation(async ({ input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      await db.insert(groups).values(input); return { success: true };
    }),
    updateGroup: adminProcedure.input(z.object({ id: z.number(), name: z.string().min(2), level: z.string().optional(), scheduleDays: z.string().optional(), scheduleTime: z.string().optional() })).mutation(async ({ input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      await db.update(groups).set({ name: input.name, level: input.level, scheduleDays: input.scheduleDays, scheduleTime: input.scheduleTime }).where(eq(groups.id, input.id)); return { success: true };
    }),
    deleteGroup: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      await db.update(students).set({ groupId: null }).where(eq(students.groupId, input.id));
      await db.delete(groups).where(eq(groups.id, input.id)); return { success: true };
    }),
    createStudent: adminProcedure.input(z.object({ name: z.string().min(2), email: z.string().email().optional().or(z.literal("")), phone: z.string().trim().min(7, "Phone number is required"), groupId: z.number().nullable().optional(), courses: z.array(courseSchema).min(1) })).mutation(async ({ input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      const accessCode = await createAccessCode();
      const result = await db.insert(students).values({ name: input.name, email: input.email || null, phone: input.phone || null, groupId: input.groupId ?? null, accessCode });
      const studentId = Number(result[0].insertId);
      await db.insert(studentCourses).values(input.courses.map(course => ({ studentId, course })));
      return { success: true, accessCode };
    }),
    updateStudent: adminProcedure.input(z.object({ id: z.number(), name: z.string().min(2), email: z.string().email().optional().or(z.literal("")), phone: z.string().trim().min(7, "Phone number is required"), groupId: z.number().nullable().optional(), status: z.enum(["active", "paused"]), courses: z.array(courseSchema).min(1) })).mutation(async ({ input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      await db.update(students).set({ name: input.name, email: input.email || null, phone: input.phone || null, groupId: input.groupId ?? null, status: input.status }).where(eq(students.id, input.id));
      await db.delete(studentCourses).where(eq(studentCourses.studentId, input.id));
      await db.insert(studentCourses).values(input.courses.map(course => ({ studentId: input.id, course })));
      return { success: true };
    }),
    deleteStudent: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      await db.delete(studentCourses).where(eq(studentCourses.studentId, input.id));
      await db.delete(students).where(eq(students.id, input.id)); return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
