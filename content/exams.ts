import "server-only";

/**
 * Banco de questoes das provas — USO EXCLUSIVO NO SERVIDOR.
 * O campo `correta` (indice da alternativa certa) nunca deve ser
 * enviado ao cliente: as paginas removem o campo antes de renderizar
 * e a correcao acontece na server action (actions/exams.ts).
 *
 * Todas as 24 questoes cobram o que os capitulos de content/course.ts
 * de fato ensinam — cada uma tem resposta rastreavel a um trecho do
 * ebook. Ao editar o conteudo, revise a prova da parte correspondente.
 */
export type Dificuldade = "facil" | "media" | "dificil";

export interface Questao {
  id: string;
  dificuldade: Dificuldade;
  pergunta: string;
  opcoes: string[];
  correta: number;
}

export interface Prova {
  parte: number;
  titulo: string;
  descricao: string;
  questoes: Questao[];
}

export const NOTA_MINIMA = 70; // %

export const provas: Prova[] = [
  {
    parte: 1,
    titulo: "Part I Exam — Landing",
    descricao:
      "Covers the first months abroad and how the American university system actually works.",
    questoes: [
      {
        id: "p1q1",
        dificuldade: "facil",
        pergunta: "What does the book call \"the freeze\"?",
        opcoes: [
          "The academic hold placed on your account when tuition is late",
          "Gradually going quiet — not speaking in class, avoiding events — until silence becomes a habit",
          "The moment your visa status is suspended for missing credits",
          "The winter break period when campus services shut down",
        ],
        correta: 1,
      },
      {
        id: "p1q2",
        dificuldade: "facil",
        pergunta:
          "According to Chapter 1, what is the real difficulty for most international students in their first months?",
        opcoes: [
          "The English language, which is almost always the main barrier",
          "The cost of textbooks and housing",
          "Everything happening at once — new country, system, culture and unwritten rules",
          "The difference in academic difficulty compared to high school",
        ],
        correta: 2,
      },
      {
        id: "p1q3",
        dificuldade: "media",
        pergunta: "What is \"the comfort trap\" the book warns about?",
        opcoes: [
          "Staying only with people from your own country, which is a relief but can keep you from ever really arriving",
          "Signing a comfortable off-campus lease you cannot afford later",
          "Taking easy classes in your first semester to protect your GPA",
          "Relying on campus dining instead of learning to cook",
        ],
        correta: 0,
      },
      {
        id: "p1q4",
        dificuldade: "media",
        pergunta: "How does Chapter 2 describe the syllabus?",
        opcoes: [
          "A formality that professors are required to hand out",
          "A draft schedule that usually changes by mid-semester",
          "The map of the entire class: every deadline, exam, rule and how your grade is calculated",
          "A summary of readings, useful only when preparing for finals",
        ],
        correta: 2,
      },
      {
        id: "p1q5",
        dificuldade: "media",
        pergunta: "Why does the book say the professor matters more than the class?",
        opcoes: [
          "Because professors decide which students receive financial aid",
          "Because the same class with a different instructor can be a completely different experience",
          "Because course titles are standardized across all universities",
          "Because only tenured professors can write recommendation letters",
        ],
        correta: 1,
      },
      {
        id: "p1q6",
        dificuldade: "dificil",
        pergunta: "How should office hours be used, according to Chapter 2?",
        opcoes: [
          "Only when you are failing and need to recover before an exam",
          "As a formality to attend once per semester so the professor knows your name",
          "Early and regularly, even for small questions — they are an advantage, not a last resort",
          "Only after you have exhausted tutoring and academic support services",
        ],
        correta: 2,
      },
    ],
  },
  {
    parte: 2,
    titulo: "Part II Exam — Finding your footing",
    descricao:
      "Covers your social circle, campus involvement and taking control of your time.",
    questoes: [
      {
        id: "p2q1",
        dificuldade: "facil",
        pergunta:
          "Beyond friendship, what does Chapter 3 say your social circle determines?",
        opcoes: [
          "The information you have access to, the standards you hold, and what feels possible",
          "Your assigned academic advisor and course registration priority",
          "Which campus housing you are eligible for in later years",
          "Your eligibility for on-campus employment",
        ],
        correta: 0,
      },
      {
        id: "p2q2",
        dificuldade: "media",
        pergunta: "What is the risk of the \"comfortable but going nowhere\" circle?",
        opcoes: [
          "These friendships usually end badly and damage your reputation",
          "They are bad people who will get you into trouble",
          "They violate most university codes of conduct",
          "They are genuinely good friends, but nobody challenges you, so you quietly start playing small",
        ],
        correta: 3,
      },
      {
        id: "p2q3",
        dificuldade: "media",
        pergunta:
          "Chapter 4 is called \"Being There Is Not Enough.\" What does that mean for clubs?",
        opcoes: [
          "Joining many clubs is what builds a strong resume",
          "Merely attending does nothing — depth, a real role and consistency are what count",
          "Clubs only matter if they are directly tied to your major",
          "You should avoid clubs entirely until your GPA is stable",
        ],
        correta: 1,
      },
      {
        id: "p2q4",
        dificuldade: "media",
        pergunta: "According to Chapter 4, how do leadership positions tend to be filled?",
        opcoes: [
          "Through competitive campus-wide elections each spring",
          "By whoever has the highest GPA in the organization",
          "By appointment from a faculty advisor",
          "They go to the people who keep showing up consistently over time",
        ],
        correta: 3,
      },
      {
        id: "p2q5",
        dificuldade: "facil",
        pergunta: "What is the central claim of Chapter 5?",
        opcoes: [
          "You do not have a time problem — you have a control problem",
          "Most students simply need to sleep less to fit everything in",
          "Time management is impossible during your first semester",
          "You should drop extracurriculars until you graduate",
        ],
        correta: 0,
      },
      {
        id: "p2q6",
        dificuldade: "dificil",
        pergunta: "What separates being busy from being productive, in Chapter 5?",
        opcoes: [
          "Productive students work longer hours than busy students",
          "Busy students do the easy, comfortable tasks; productive students choose what matters and do that first",
          "Busy students study alone while productive students study in groups",
          "Productivity is measured by how many tasks you complete in a day",
        ],
        correta: 1,
      },
    ],
  },
  {
    parte: 3,
    titulo: "Part III Exam — Standing on your own",
    descricao:
      "Covers money, independence and how to find your direction without waiting for clarity.",
    questoes: [
      {
        id: "p3q1",
        dificuldade: "facil",
        pergunta: "What is the \"vacation mindset\" described in Chapter 6?",
        opcoes: [
          "Traveling home too often during your first semester",
          "Treating your first weeks like an adventure and spending as if you were on vacation",
          "Taking a reduced course load in your first term",
          "Skipping class during the weeks around a holiday",
        ],
        correta: 1,
      },
      {
        id: "p3q2",
        dificuldade: "media",
        pergunta:
          "What realization does Chapter 6 say hits most students around the end of their first month?",
        opcoes: [
          "That their visa paperwork was filed incorrectly",
          "That their chosen major will not be available next term",
          "That they are not just studying in the U.S. — they are living here, and living costs money",
          "That they should have applied to a cheaper university",
        ],
        correta: 2,
      },
      {
        id: "p3q3",
        dificuldade: "facil",
        pergunta: "According to Chapter 7, where does clarity about your direction come from?",
        opcoes: [
          "From moving — gathering real information through real experiences",
          "From waiting until you feel genuinely ready to decide",
          "From personality tests and careful research before acting",
          "From choosing the major with the strongest salary outcomes",
        ],
        correta: 0,
      },
      {
        id: "p3q4",
        dificuldade: "media",
        pergunta: "What is the \"overthinking trap\"?",
        opcoes: [
          "Taking too many credits in an attempt to explore several fields",
          "Changing your major more than once during your degree",
          "Consuming career content and making lists endlessly while never gathering real experience",
          "Asking too many people for advice and receiving contradictory answers",
        ],
        correta: 2,
      },
      {
        id: "p3q5",
        dificuldade: "media",
        pergunta:
          "What advantage does Chapter 7 say most U.S. students have but fail to use?",
        opcoes: [
          "Unlimited free tutoring in every subject",
          "Roughly the first two years before fully committing to a major",
          "The ability to transfer between universities without losing credits",
          "Guaranteed internship placement through the career center",
        ],
        correta: 1,
      },
      {
        id: "p3q6",
        dificuldade: "dificil",
        pergunta:
          "What does the book suggest doing to learn what a major actually leads to?",
        opcoes: [
          "Read the department's official program description carefully",
          "Compare starting salary tables across fields",
          "Wait for a required introductory course to reveal whether you enjoy it",
          "Talk to students already in it and to alumni, and look at what those graduates really do for work",
        ],
        correta: 3,
      },
    ],
  },
  {
    parte: 4,
    titulo: "Part IV Exam — Building the career",
    descricao:
      "Covers resumes, campus jobs, CPT and OPT, internships and the mental side of all of it.",
    questoes: [
      {
        id: "p4q1",
        dificuldade: "facil",
        pergunta: "According to Chapter 8, what is a resume's only job?",
        opcoes: [
          "To get you the job",
          "To make someone want to talk to you — it gets you the conversation",
          "To list every class and activity you have completed",
          "To prove your GPA meets the employer's cutoff",
        ],
        correta: 1,
      },
      {
        id: "p4q2",
        dificuldade: "media",
        pergunta: "What resume formula does Chapter 8 recommend?",
        opcoes: [
          "Job title + duration + department name",
          "\"Was responsible for\" + a clear description of your duties",
          "Action verb + what you did + what it produced",
          "A short paragraph per role, written in the first person",
        ],
        correta: 2,
      },
      {
        id: "p4q3",
        dificuldade: "media",
        pergunta:
          "Under F-1 status, what does Chapter 9 say about on-campus work while school is in session?",
        opcoes: [
          "It is limited to 20 hours per week and needs no extra authorization beyond being enrolled",
          "It is unlimited as long as your GPA stays above 3.0",
          "It requires prior approval from USCIS for every position",
          "It is not permitted at all during your first year",
        ],
        correta: 0,
      },
      {
        id: "p4q4",
        dificuldade: "dificil",
        pergunta:
          "Why does Chapter 9 call an on-campus job the clearest path to a Social Security Number in your first year?",
        opcoes: [
          "Universities issue SSNs directly to enrolled international students",
          "An SSN is granted automatically after two semesters of enrollment",
          "As an F-1 student, the way to get an SSN is to hold an authorized job — and on campus is the clearest first-year route",
          "The SSN is only needed for off-campus work, which starts in year two",
        ],
        correta: 2,
      },
      {
        id: "p4q5",
        dificuldade: "dificil",
        pergunta: "What CPT mistake does Chapter 10 warn about most strongly?",
        opcoes: [
          "Using CPT for an unpaid internship, which is never authorized",
          "Accumulating 12 months or more of full-time CPT, which eliminates your OPT eligibility entirely",
          "Applying for CPT before completing one academic year",
          "Using CPT and OPT in the same calendar year",
        ],
        correta: 1,
      },
      {
        id: "p4q6",
        dificuldade: "media",
        pergunta: "What is the \"applications-only trap\" in Chapter 11?",
        opcoes: [
          "Applying to too few positions and running out of options",
          "Applying before your resume has been reviewed by the career center",
          "Submitting the same resume to every company without tailoring it",
          "Relying on portal submissions, where you are one of thousands — instead of building relationships first",
        ],
        correta: 3,
      },
    ],
  },
];

export function getProva(parte: number) {
  return provas.find((p) => p.parte === parte) ?? null;
}
