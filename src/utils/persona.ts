import type { OnboardingProfile, PriorityLens, ReminderStyle, WorkStyle } from '../types';

export interface Persona {
  title: string;
  description: string;
}

const BASE: Record<WorkStyle, Record<PriorityLens, { title: string; why: string }>> = {
  planner: {
    urgency: { title: 'The Early-Bird Strategist', why: 'You plan ahead and keep a close eye on whatever is due soonest, so deadlines rarely catch you off guard.' },
    importance: { title: 'The Big-Picture Architect', why: 'You map your work out in advance and give your best hours to what matters most.' },
    effort: { title: 'The Steady Builder', why: 'You plan ahead and break work into pieces you can finish one at a time.' },
  },
  'deadline-driven': {
    urgency: { title: 'The Clutch Closer', why: 'You do your sharpest work as the clock runs down, and you always know what is due next.' },
    importance: { title: 'The Pressure Performer', why: 'Deadlines focus you, and you save your energy for the work that counts the most.' },
    effort: { title: 'The Sprint Finisher', why: 'You thrive on a deadline rush and love clearing quick tasks fast.' },
  },
  spontaneous: {
    urgency: { title: 'The Firefighter', why: 'You follow whatever feels urgent and put out the biggest fire first.' },
    importance: { title: 'The Instinct Navigator', why: 'You go with your gut toward what matters most in the moment.' },
    effort: { title: 'The Quick-Win Hunter', why: 'You go with the flow and build momentum by ticking off small wins.' },
  },
};

const REMINDER: Record<ReminderStyle, string> = {
  early: 'Early reminders keep you comfortably ahead.',
  'last-minute': 'A nudge right before something is due is all you need.',
  'self-check': 'You like checking in on your own, so nudges stay out of your way.',
};

/** A title and a one-or-two-sentence reason, derived from the onboarding answers. */
export function personaFor(profile: OnboardingProfile | null): Persona | null {
  if (!profile?.workStyle || !profile.priorityLens || !profile.reminderStyle) return null;
  const base = BASE[profile.workStyle]?.[profile.priorityLens];
  if (!base) return null;
  return { title: base.title, description: `${base.why} ${REMINDER[profile.reminderStyle] ?? ''}`.trim() };
}
