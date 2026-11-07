// Fixed schedule templates and shared tracking configuration for the FOM dashboard.
// Times are intentionally data-only; the interface has no time-editing controls.
(() => {
  "use strict";

  const categories = Object.freeze([
    "Study",
    "Analysis",
    "Revision",
    "Breakfast",
    "Lunch",
    "Dinner",
    "Nap",
    "Night Sleep",
    "Workout",
    "Break",
    "Free",
    "Planning",
    "Fuel",
    "Recovery",
    "Free Zone",
  ]);

  const modes = Object.freeze([
    Object.freeze({
      id: "full-capacity",
      label: "Full Capacity",
      description: "Follow the full fixed schedule and protect the recovery blocks.",
    }),
    Object.freeze({
      id: "modified-load",
      label: "Modified Load",
      description: "Keep the schedule anchors and reduce the day's work to a manageable load.",
    }),
    Object.freeze({
      id: "recovery-plan",
      label: "Recovery Plan",
      description: "Prioritize recovery and essential commitments; avoid adding work to the day.",
    }),
    Object.freeze({
      id: "essential-plan",
      label: "Essential Plan",
      description: "Keep only essential commitments and recovery. Resume the regular load when ready.",
    }),
  ]);

  const errorCodes = Object.freeze([
    Object.freeze({ code: "C", label: "Concept" }),
    Object.freeze({ code: "T", label: "Technique" }),
    Object.freeze({ code: "A", label: "Algebra" }),
    Object.freeze({ code: "P", label: "Proof" }),
    Object.freeze({ code: "M", label: "Misread" }),
    Object.freeze({ code: "S", label: "Speed" }),
    Object.freeze({ code: "D", label: "Didn't try" }),
  ]);

  const scoreFields = Object.freeze([
    Object.freeze({ id: "sleepQuality", label: "Sleep Quality", scale: "higher-is-better" }),
    Object.freeze({ id: "energy", label: "Energy", scale: "higher-is-better" }),
    Object.freeze({ id: "mood", label: "Mood", scale: "higher-is-better" }),
    Object.freeze({ id: "focus", label: "Focus", scale: "higher-is-better" }),
    Object.freeze({ id: "motivation", label: "Motivation", scale: "higher-is-better" }),
  ]);

  const sleepinessCheckpoints = Object.freeze(["11:05", "15:25", "16:45"]);

  const modePlans = Object.freeze({
    "full-capacity": Object.freeze({
      weekday: Object.freeze({
        studyTarget: "Full weekday plan · 10 h 40 m study",
        summary: "Run the complete weekday plan. All fixed block times stay unchanged.",
        instructions: Object.freeze([
          "Complete each study block as written; keep FOM-4 for analysis only.",
          "Keep the recovery blocks, meals, workout, and final revision in place.",
        ]),
        overrides: Object.freeze({}),
      }),
      saturday: Object.freeze({
        studyTarget: "Saturday plan · 5 h 10 m study",
        summary: "Run the full milestone day and protect the seven-hour Free Zone.",
        instructions: Object.freeze([
          "Complete S1 and the weekly timed set; leave analysis for Sunday.",
          "Keep the Free Zone protected and finish with the short closing revision.",
        ]),
        overrides: Object.freeze({}),
      }),
      sunday: Object.freeze({
        studyTarget: "Sunday plan · 3 h 35 m study",
        summary: "Run the review-and-reset day; keep both Free Zones and family time.",
        instructions: Object.freeze([
          "Review Saturday's set before recall or new work.",
          "Complete the weekly review and brief closing revision without extending study.",
        ]),
        overrides: Object.freeze({}),
      }),
    }),
    "modified-load": Object.freeze({
      weekday: Object.freeze({
        studyTarget: "Modified weekday load · about 9 h 20 m study",
        summary: "Use the reduced-load plan. Complete only the target duration inside each fixed block; use its remaining time for recovery.",
        instructions: Object.freeze([
          "Shorten FOM-4 to 30 min, Physics and Chemistry to 70 min each, Computer + English to 70 min, and revision to 50 min.",
          "The freed time is recovery, not extra study. Fixed start/end times do not move.",
        ]),
        overrides: Object.freeze({
          physics: Object.freeze({ detail: "70 min: keep the key concept work and selected problems; use the remaining 10 min for recovery within this fixed block." }),
          chemistry: Object.freeze({ detail: "70 min: keep the key concept work and selected problems; use the remaining 10 min for recovery within this fixed block." }),
          "computer-english": Object.freeze({ detail: "70 min total: Computer Science 35 min + English 35 min; use the remaining 10 min for recovery within this fixed block." }),
          "fom-4": Object.freeze({ detail: "30 min: analyse today's X problems and weakest proof only; use the remaining 30 min for recovery within this fixed block." }),
          "free-evening": Object.freeze({ detail: "Free evening. Add the 30 min released by the reduced study targets; no study." }),
          "break-3": Object.freeze({ detail: "Break 3. Add 15 min of recovery from the reduced study targets; no study." }),
          revision: Object.freeze({ detail: "50 min: Maths 30 min + other subjects 20 min; use the remaining 20 min for recovery within this fixed block." }),
        }),
      }),
      saturday: Object.freeze({
        studyTarget: "Modified Saturday load · about 3 h 50 m study",
        summary: "Keep the milestone, shorten the timed set and supporting study, and return saved time to recovery.",
        instructions: Object.freeze([
          "Keep S1 at 90 min; stop S2 after 60 min, PCM after 30 min, C+E after 35 min, and closing revision after 15 min.",
          "Use the rest of each fixed block for recovery; keep the Free Zone protected.",
        ]),
        overrides: Object.freeze({
          "s2-timed-set": Object.freeze({ detail: "60 min timed set; use the remaining 30 min of this fixed block for recovery." }),
          "pcm-weekly-check": Object.freeze({ detail: "30 min combined Physics + Chemistry check; use the remaining 30 min for recovery." }),
          "computer-english": Object.freeze({ detail: "35 min total: a short Computer Science task and English practice; use the remaining 10 min for recovery." }),
          revision: Object.freeze({ detail: "15 min closing revision from today's pages; use the remaining 10 min for recovery." }),
        }),
      }),
      sunday: Object.freeze({
        studyTarget: "Modified Sunday load · about 2 h 35 m study",
        summary: "Shorten recall and literacy, retain the weekly review, and preserve the Free Zones.",
        instructions: Object.freeze([
          "Shorten S3 to 45 min, S4 to 30 min, calm literacy to 20 min, and closing revision to 15 min.",
          "Use each fixed block's remaining time for recovery; do not extend study into the Free Zones.",
        ]),
        overrides: Object.freeze({
          "s3-analysis": Object.freeze({ detail: "45 min analysis and rewrite; use the remaining 30 min for recovery within this fixed block.", category: "Analysis" }),
          "s4-recall": Object.freeze({ detail: "30 min recall without notes; use the remaining 15 min for recovery within this fixed block." }),
          "computer-english": Object.freeze({ detail: "20 min calm literacy; use the remaining 10 min for recovery within this fixed block." }),
          revision: Object.freeze({ detail: "15 min closing revision of the week's weak spots; use the remaining 5 min for recovery." }),
        }),
      }),
    }),
    "recovery-plan": Object.freeze({
      weekday: Object.freeze({
        studyTarget: "Recovery weekday plan · about 5 h 20 m study",
        summary: "Use the lighter recovery plan. Do the listed short study targets within their fixed blocks; the rest of the day stays recovery.",
        instructions: Object.freeze([
          "FOM-1 60 min; FOM-2 60 min; Physics and Chemistry 50 min each; Computer + English 30 min; FOM-4 30 min; revision 40 min.",
          "Replace FOM-3 and the workout with recovery/easy movement. Keep meals and nap; fixed schedule times remain displayed and unchanged.",
        ]),
        overrides: Object.freeze({
          wake: Object.freeze({ detail: "Slow morning and check-in. Keep the usual wake window; choose the recovery plan and lower the day's demands." }),
          "fom-1": Object.freeze({ detail: "60 min: reading and one reconstruction only. Use the remaining 30 min for recovery within this fixed block." }),
          "break-1": Object.freeze({ detail: "15 min outdoors; move gently and drink water." }),
          "fom-2": Object.freeze({ detail: "60 min: Tier 1–2 practice only; no Tier 3. Use the remaining 30 min for recovery." }),
          breakfast: Object.freeze({ detail: "Unhurried breakfast." }),
          physics: Object.freeze({ detail: "50 min: key concepts and three selected problems. Use the remaining 30 min for recovery." }),
          "break-2": Object.freeze({ detail: "Recovery break. Sunlight, water, and quiet rest; mini-nap only if helpful." }),
          chemistry: Object.freeze({ detail: "50 min: key concepts and three selected problems, or flashcards. Use the remaining 30 min for recovery." }),
          "computer-english": Object.freeze({ detail: "30 min only: choose one item, either English reading for pleasure or a light Computer Science review. Use the remaining 50 min for recovery.", category: "Recovery" }),
          "fom-3": Object.freeze({ detail: "Recovery instead of deep study. Do not move this block's work later.", category: "Recovery", title: "Recovery block (replaces FOM-3)" }),
          "fom-4": Object.freeze({ detail: "30 min: review today's X problems and weakest proof; identify and correct only the most important errors." }),
          workout: Object.freeze({ detail: "Easy movement only, such as a comfortable walk or gentle stretching. Skip strenuous exercise.", category: "Recovery", title: "Easy movement / recovery" }),
          revision: Object.freeze({ detail: "40 min: Maths 25 min + other subjects 15 min. Keep revision as the final study block." }),
          "night-routine": Object.freeze({ detail: "Wind down early if tired; lights-out must not be later than the fixed schedule." }),
        }),
      }),
      saturday: Object.freeze({
        studyTarget: "Recovery Saturday plan · at most 45 min study",
        summary: "Protect sleep, meals, nap, and the Free Zone. Keep only one gentle milestone touch and a brief paper review if comfortable.",
        instructions: Object.freeze([
          "Limit study to an optional 30 min gentle S1 touch and up to 15 min closing revision.",
          "Skip the timed set and weekly checks. Keep the Free Zone and recovery blocks.",
        ]),
        overrides: Object.freeze({
          "s1-milestone": Object.freeze({ detail: "Optional 30 min gentle milestone touch; stop sooner if it feels difficult. Use the remainder for recovery.", category: "Recovery", title: "Optional gentle milestone touch" }),
          "s2-timed-set": Object.freeze({ detail: "Skip the timed set. Use this fixed block for rest, outdoor time, or a quiet hobby.", category: "Recovery", title: "Recovery time (timed set skipped)" }),
          "pcm-weekly-check": Object.freeze({ detail: "Skip the weekly check; use this fixed block for recovery.", category: "Recovery", title: "Recovery time (weekly check skipped)" }),
          "computer-english": Object.freeze({ detail: "Skip study; rest or do a calm non-study activity.", category: "Recovery", title: "Recovery time" }),
          revision: Object.freeze({ detail: "Optional 15 min gentle paper revision; skip if it adds strain." }),
        }),
      }),
      sunday: Object.freeze({
        studyTarget: "Recovery Sunday plan · at most 45 min study",
        summary: "Keep the day restorative. Retain a brief review touch only if useful; do not fill the Free Zones with work.",
        instructions: Object.freeze([
          "Use up to 30 min for a gentle S3 review and up to 15 min for paper revision; skip either if unwell or overwhelmed.",
          "Skip S4 and calm literacy. Keep the weekly planning brief and preserve recovery time.",
        ]),
        overrides: Object.freeze({
          "s3-analysis": Object.freeze({ detail: "Optional 30 min: review one useful lesson from Saturday. Use the rest for recovery.", category: "Recovery", title: "Optional gentle review" }),
          "s4-recall": Object.freeze({ detail: "Skip recall practice. Use this fixed block for quiet recovery.", category: "Recovery", title: "Recovery time (recall skipped)" }),
          "computer-english": Object.freeze({ detail: "Skip study; choose rest or a calm non-study activity.", category: "Recovery", title: "Recovery time" }),
          revision: Object.freeze({ detail: "Optional 15 min paper revision of one weak spot; stop if it adds strain." }),
        }),
      }),
    }),
    "essential-plan": Object.freeze({
      weekday: Object.freeze({
        studyTarget: "Essential weekday plan · 45 min study maximum",
        summary: "Reduce the day to recovery and essential commitments. The fixed timetable remains visible; most study blocks become recovery.",
        instructions: Object.freeze([
          "Optional gentle FOM touch up to 30 min and paper revision up to 15 min; stop if either feels like too much.",
          "Skip all other study and strenuous exercise. Keep meals, nap, and a quiet wind-down; do not make up missed work.",
        ]),
        overrides: Object.freeze({
          wake: Object.freeze({ detail: "Slow wake-up, water, and daylight. Skip mobility if it does not feel right." }),
          "fom-1": Object.freeze({ detail: "Optional 30 min: one easy Tier 1 problem or reread yesterday's notes. Stop sooner if needed.", category: "Recovery", title: "Optional gentle FOM touch" }),
          "fom-2": Object.freeze({ detail: "Skip practice; use the fixed block for rest or a quiet non-study activity.", category: "Recovery", title: "Recovery time (practice skipped)" }),
          physics: Object.freeze({ detail: "No study target. Rest, get daylight, or do a calm activity.", category: "Recovery", title: "Recovery time (study skipped)" }),
          "break-2": Object.freeze({ detail: "Quiet recovery, water, and fresh air. Rest is enough; do not force a nap." }),
          chemistry: Object.freeze({ detail: "No study target. Rest, get daylight, or do a calm activity.", category: "Recovery", title: "Recovery time (study skipped)" }),
          "computer-english": Object.freeze({ detail: "Skip study. Choose rest or one calm, enjoyable activity.", category: "Recovery", title: "Recovery time (study skipped)" }),
          workout: Object.freeze({ detail: "Skip strenuous exercise. Gentle movement only if comfortable.", category: "Recovery", title: "Recovery (workout skipped)" }),
          "fom-3": Object.freeze({ detail: "Skip deep work and recover. No catch-up later.", category: "Recovery", title: "Recovery time (deep work skipped)" }),
          "fom-4": Object.freeze({ detail: "Skip formal analysis today. Rest; return to the log when ready.", category: "Recovery", title: "Recovery time (analysis skipped)" }),
          revision: Object.freeze({ detail: "Optional 15 min of easy paper flashcards only. Skip if it feels burdensome.", category: "Recovery", title: "Optional 15 min gentle revision" }),
        }),
      }),
      saturday: Object.freeze({
        studyTarget: "Essential Saturday plan · 30 min study maximum",
        summary: "Recovery is the priority. Skip timed work and retain one optional gentle touch only.",
        instructions: Object.freeze([
          "Optional 30 min gentle S1 touch; skip the timed set, weekly check, Computer + English, and revision.",
          "Keep meals, nap, and the protected Free Zone. No catch-up work.",
        ]),
        overrides: Object.freeze({
          "s1-milestone": Object.freeze({ detail: "Optional 30 min gentle attempt or review; stop sooner if needed.", category: "Recovery", title: "Optional gentle study touch" }),
          "s2-timed-set": Object.freeze({ detail: "Skip timed work and recover.", category: "Recovery", title: "Recovery time (timed work skipped)" }),
          "pcm-weekly-check": Object.freeze({ detail: "Skip the weekly check and recover.", category: "Recovery", title: "Recovery time (study skipped)" }),
          "computer-english": Object.freeze({ detail: "Skip study and recover.", category: "Recovery", title: "Recovery time (study skipped)" }),
          revision: Object.freeze({ detail: "Skip revision today; rest without making up the work.", category: "Recovery", title: "Recovery time (revision skipped)" }),
        }),
      }),
      sunday: Object.freeze({
        studyTarget: "Essential Sunday plan · 30 min study maximum",
        summary: "Recovery is the priority. Skip recall and literacy; keep one optional gentle review touch.",
        instructions: Object.freeze([
          "Optional 30 min gentle S3 review; skip S4, calm literacy, and revision.",
          "Keep the Free Zones, meals, nap, and low-pressure weekly planning.",
        ]),
        overrides: Object.freeze({
          "s3-analysis": Object.freeze({ detail: "Optional 30 min gentle review of one takeaway; stop sooner if needed.", category: "Recovery", title: "Optional gentle review" }),
          "s4-recall": Object.freeze({ detail: "Skip recall practice and recover.", category: "Recovery", title: "Recovery time (study skipped)" }),
          "computer-english": Object.freeze({ detail: "Skip study and recover.", category: "Recovery", title: "Recovery time (study skipped)" }),
          revision: Object.freeze({ detail: "Skip revision today; rest without making up the work.", category: "Recovery", title: "Recovery time (revision skipped)" }),
        }),
      }),
    }),
  });

  const makeBlock = (id, start, end, title, category, detail = "", milestone = false) =>
    Object.freeze({ id, start, end, title, category, detail, milestone });

  const weekday = Object.freeze([
    makeBlock("wake", "07:00", "07:30", "Wake-up + slow morning", "Recovery", "Water, wash, mobility, plan the day, daylight, and morning check."),
    makeBlock("fom-1", "07:30", "09:00", "FOM-1 · Learn", "Study", "Hardest new thinking while fresh."),
    makeBlock("break-1", "09:00", "09:15", "Break 1", "Break", "Step outside, drink water, and look into the distance."),
    makeBlock("fom-2", "09:15", "10:45", "FOM-2 · Practice", "Study", "Apply the material; mark each problem C / H / X."),
    makeBlock("breakfast", "10:45", "11:05", "Breakfast", "Breakfast", "A proper meal."),
    makeBlock("physics", "11:05", "12:25", "PHY · Physics", "Study", "One focused block; follow the day's subject rotation."),
    makeBlock("break-2", "12:25", "12:55", "Break 2 + mini-nap", "Recovery", "Short rest, water, and fresh air."),
    makeBlock("chemistry", "12:55", "14:15", "CHE · Chemistry", "Study", "One focused block; rotate Physical, Organic, and Inorganic."),
    makeBlock("lunch", "14:15", "14:45", "Lunch", "Lunch", "Moderate meal; fuel rather than a food coma."),
    makeBlock("nap-1", "14:45", "15:15", "Nap 1", "Nap", "Thirty-minute nap; get up at the end."),
    makeBlock("reset", "15:15", "15:25", "Reset", "Recovery", "Water, face wash, light, and standing stretches."),
    makeBlock("computer-english", "15:25", "16:45", "C+E · Computer + English", "Study", "Computer Science 40 min + English 40 min in the day's order."),
    makeBlock("break-3", "16:45", "17:00", "Break 3", "Break", "Fresh air and movement."),
    makeBlock("rest-2", "17:00", "17:10", "Rest 2", "Recovery", "Eyes-closed rest; not a nap."),
    makeBlock("workout", "17:10", "17:45", "Workout", "Workout", "Daily workout."),
    makeBlock("bath-fuel", "17:45", "18:05", "Bath + light fuel", "Fuel", "Bath, then a small snack."),
    makeBlock("fom-3", "18:05", "19:35", "FOM-3 · Prove & Lock", "Study", "Write the day's key proof and attempt the hardest problem.", true),
    makeBlock("break-4", "19:35", "19:45", "Break 4", "Break", "Decompress; no screens."),
    makeBlock("fom-4", "19:45", "20:45", "FOM-4 · Analysis", "Analysis", "Review today's work, identify mistakes, and correct them."),
    makeBlock("shutdown", "20:45", "20:55", "Shutdown ritual", "Recovery", "Tomorrow's card and daily log; record the formal HIT / MISS result."),
    makeBlock("free-evening", "20:55", "21:35", "Free evening", "Free", "Family, hobby, or music; no study."),
    makeBlock("evening-reading", "21:35", "21:55", "Evening reading", "Recovery", "Paper book; stop when dinner starts."),
    makeBlock("dinner", "21:55", "22:30", "Dinner", "Dinner", "Fixed family window; light-to-moderate meal."),
    makeBlock("revision", "22:30", "23:40", "REV · Revision — last block", "Revision", "Maths 40 min + all other subjects 30 min; paper only."),
    makeBlock("night-routine", "23:40", "23:45", "Night routine + lights-out prep", "Recovery", "Brush, dim lights, and prepare for sleep."),
    makeBlock("night-sleep", "23:45", "07:00", "Night sleep", "Night Sleep", "Fixed sleep block; ends at the next weekday wake-up."),
  ]);

  const saturday = Object.freeze([
    makeBlock("wake", "07:30", "08:00", "Wake-up + slow morning", "Recovery", "Slow start and mobility."),
    makeBlock("s1-milestone", "08:00", "09:30", "S1 · Milestone attempt (unaided)", "Study", "The week's checkable result, from a blank page.", true),
    makeBlock("break-1", "09:30", "09:45", "Break", "Break", "Move and drink water."),
    makeBlock("s2-timed-set", "09:45", "11:15", "S2 · Weekly timed set", "Study", "Exam-style problems under real conditions.", true),
    makeBlock("breakfast", "11:15", "11:35", "Breakfast", "Breakfast", "Breakfast; bath comes after the Free Zone sport."),
    makeBlock("pcm-weekly-check", "11:35", "12:35", "PCM weekly check", "Study", "Physics 30 min + Chemistry 30 min: closed-book test, then fix."),
    makeBlock("break-2", "12:35", "12:50", "Break", "Break", "Take the break outdoors."),
    makeBlock("computer-english", "12:50", "13:35", "C+E · Code & write", "Study", "Computer Science 25 min + English 20 min."),
    makeBlock("lunch", "13:35", "14:05", "Lunch", "Lunch", "Lunch, with family if possible."),
    makeBlock("nap-1", "14:05", "14:35", "Nap 1", "Nap", "Thirty-minute nap."),
    makeBlock("reset", "14:35", "14:45", "Reset", "Recovery", "Water and light."),
    makeBlock("free-zone", "14:45", "21:45", "FREE ZONE", "Free Zone", "Seven protected hours for sport, outdoors, friends, family, and hobbies. No study."),
    makeBlock("shutdown", "21:45", "21:55", "Shutdown ritual", "Recovery", "Daily log and jot Sunday's seeds."),
    makeBlock("dinner", "21:55", "22:30", "Dinner", "Dinner", "Fixed family window."),
    makeBlock("revision", "22:30", "22:55", "REV-W · Closing revision", "Revision", "Maths 10 min · Physics 5 · Chemistry 5 · Computer Science 2 · English 3."),
    makeBlock("free-evening", "22:55", "23:10", "Free evening", "Free", "No study."),
    makeBlock("evening-reading", "23:10", "23:40", "Evening reading", "Recovery", "Paper book."),
    makeBlock("night-routine", "23:40", "23:45", "Night routine + lights-out prep", "Recovery", "Prepare for sleep."),
    makeBlock("night-sleep", "23:45", "07:30", "Night sleep", "Night Sleep", "Fixed sleep block; ends at the next weekend wake-up."),
  ]);

  const sunday = Object.freeze([
    makeBlock("wake", "07:30", "08:00", "Wake-up + slow morning", "Recovery", "Slow start."),
    makeBlock("s3-analysis", "08:00", "09:15", "S3 · Analysis & rewrite", "Analysis", "Learn from Saturday's timed set; write two model solutions.", true),
    makeBlock("break-1", "09:15", "09:30", "Break", "Break", "Move and drink water."),
    makeBlock("s4-recall", "09:30", "10:15", "S4 · Recall without notes", "Study", "Recall the week's key results from a blank page.", true),
    makeBlock("breakfast", "10:15", "10:35", "Breakfast", "Breakfast", "Breakfast; bath comes after the Free Zone."),
    makeBlock("computer-english", "10:35", "11:05", "C+E · Calm literacy", "Study", "English reading for pleasure or a light Computer Science review."),
    makeBlock("free-zone-a", "11:05", "13:30", "FREE ZONE A", "Free Zone", "Long walk or cycle, sport, and family; no study."),
    makeBlock("lunch", "13:30", "14:00", "Lunch", "Lunch", "Lunch with family."),
    makeBlock("nap-1", "14:00", "14:30", "Nap 1", "Nap", "Thirty-minute nap."),
    makeBlock("reset", "14:30", "14:40", "Reset", "Recovery", "Reset after the nap."),
    makeBlock("free-zone-b", "14:40", "18:45", "FREE ZONE B", "Free Zone", "Anything that is not study; bath after any sport."),
    makeBlock("weekly-review", "18:45", "19:30", "Weekly Review & planning", "Planning", "Energy dashboard 5 min · review 15 · plan next week 10 · helper sync 15."),
    makeBlock("shutdown", "19:30", "19:45", "Shutdown + Monday prep", "Recovery", "Monday's milestone card, bag, and clothes."),
    makeBlock("family-evening", "19:45", "21:55", "Family evening", "Free", "Family time; no study."),
    makeBlock("dinner", "21:55", "22:30", "Dinner", "Dinner", "Fixed family window."),
    makeBlock("revision", "22:30", "22:50", "REV-W · Closing revision", "Revision", "Maths 10 min · Physics 3 · Chemistry 3 · Computer Science 2 · English 2."),
    makeBlock("wind-down", "22:50", "23:10", "Free / wind-down", "Free", "No study and no screens."),
    makeBlock("evening-reading", "23:10", "23:40", "Evening reading", "Recovery", "Paper book."),
    makeBlock("night-routine", "23:40", "23:45", "Night routine + lights-out prep", "Recovery", "Prepare for sleep."),
    makeBlock("night-sleep", "23:45", "07:00", "Night sleep", "Night Sleep", "Fixed sleep block; ends at the next weekday wake-up."),
  ]);

  const templates = Object.freeze({
    weekday: Object.freeze({
      id: "weekday",
      label: "Weekday",
      days: Object.freeze([1, 2, 3, 4, 5]),
      summary: "Monday–Friday · wake 07:00 · lights out 23:45",
      blocks: weekday,
    }),
    saturday: Object.freeze({
      id: "saturday",
      label: "Saturday",
      days: Object.freeze([6]),
      summary: "Saturday · wake 07:30 · lights out 23:45",
      blocks: saturday,
    }),
    sunday: Object.freeze({
      id: "sunday",
      label: "Sunday",
      days: Object.freeze([0]),
      summary: "Sunday · wake 07:30 · lights out 23:45",
      blocks: sunday,
    }),
  });

  window.FOM_SCHEDULE_CONFIG = Object.freeze({
    version: "2.1",
    categories,
    modes,
    errorCodes,
    scoreFields,
    sleepinessCheckpoints,
    modePlans,
    templates,
    templateForDay(day) {
      if (!Number.isInteger(day) || day < 0 || day > 6) {
        throw new RangeError("Day must be an integer from 0 (Sunday) to 6 (Saturday).");
      }
      if (day === 0) return templates.sunday;
      if (day === 6) return templates.saturday;
      return templates.weekday;
    },
  });
})();
