import { describe, expect, it } from 'vitest';
import { CLASS_DAYS, computeGpa, isClassDay, processEducationDay } from '../src/engine/education';
import { performAction } from '../src/engine/simulationEngine';
import { at, makeGame } from './helpers';

describe('education', () => {
  it('enrols students with tuition handled and class days on weekdays', () => {
    const s = makeGame({ lifeStage: 'student', backgroundId: 'struggling', universityId: 'uitm', courseId: 'cs' });
    expect(s.education.status).toBe('studying');
    expect(s.finance.debts.some((d) => d.kind === 'ptptn')).toBe(true);
    expect(isClassDay(s, 0)).toBe(true);
    expect(isClassDay(s, 5)).toBe(false); // Saturday
  });

  it('scholarship students do not take a study loan for fees', () => {
    const s = makeGame({ lifeStage: 'student', backgroundId: 'scholar', universityId: 'um', courseId: 'cs' });
    expect(s.education.scholarship).toBe(true);
    expect(s.finance.debts.some((d) => d.kind === 'ptptn')).toBe(false);
  });

  it('attending class raises knowledge and attendance', () => {
    const s = makeGame({ lifeStage: 'student', universityId: 'um', courseId: 'cs' });
    const r = performAction(s, 'attend-class');
    expect(r.feedback.ok).toBe(true);
    expect(r.state.education.classesAttended).toBe(1);
    expect(r.state.education.knowledge).toBeGreaterThan(s.education.knowledge);
  });

  it('GPA rewards study, attendance and assignments', () => {
    const s = makeGame({ lifeStage: 'student', universityId: 'um', courseId: 'bba' });
    const e = s.education;
    e.classesHeld = 60;
    e.classesAttended = 10;
    e.knowledge = 10;
    const weak = computeGpa(s);
    e.classesAttended = 60;
    e.knowledge = 80;
    e.assignmentsDone = 4;
    const strong = computeGpa(s);
    expect(strong).toBeGreaterThan(weak);
    expect(strong).toBeGreaterThanOrEqual(3.5);
    expect(weak).toBeLessThan(2);
  });

  it('records semester results and graduates after the final semester with a passing FYP', () => {
    const s = makeGame({ lifeStage: 'student', universityId: 'um', courseId: 'bba', startSemester: 7 });
    const e = s.education;
    expect(e.semester).toBe(7);
    Object.assign(e, { classesHeld: 60, classesAttended: 60, knowledge: 90, assignmentsDone: 4, fypProgress: 80 });
    at(s, CLASS_DAYS, 0);
    processEducationDay(s);
    expect(s.education.status).toBe('graduated');
    expect(s.education.qualification).toBe('degree');
    expect(s.character.lifeStage).toBe('fresh_grad');
  });

  it('requires an extra semester when the FYP is incomplete', () => {
    const s = makeGame({ lifeStage: 'student', universityId: 'um', courseId: 'bba', startSemester: 7 });
    Object.assign(s.education, { classesHeld: 60, classesAttended: 60, knowledge: 90, assignmentsDone: 4, fypProgress: 20 });
    at(s, CLASS_DAYS, 0);
    processEducationDay(s);
    expect(s.education.status).toBe('studying');
    expect(s.education.totalSemesters).toBe(8);
  });
});
