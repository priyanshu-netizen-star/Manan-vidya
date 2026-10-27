/**
 * Seed content for the presentation environment.
 *
 * - Learning material and questions are original text written by VoxVision for this proposal.
 *   They are sample content for teachers to review, replace or approve; they are not copied
 *   from textbooks.
 * - Knowledge-base facts come only from the school's PUBLIC website (retrieved 27 Oct 2026) and are
 *   marked "public_source" until the school confirms them. Hindi text is a VoxVision draft
 *   translation awaiting review by a fluent staff member (hindi_reviewed = false).
 */

type Q = { prompt: string; options: [string, string, string, string]; answer: 0 | 1 | 2 | 3; explanation: string; difficulty?: "easy" | "medium" | "hard" };
export type TopicSeed = { subject: string; classLevel: number; name: string; summary: string; material: { title: string; body: string }; questions: Q[] };

export const SUBJECTS = [
  { name: "Mathematics", code: "MATH" },
  { name: "Science", code: "SCI" },
  { name: "English", code: "ENG" },
  { name: "Social Science", code: "SST" },
  { name: "Computer Science", code: "CS" },
  { name: "Hindi", code: "HIN" },
] as const;

export const TOPICS: TopicSeed[] = [
  {
    subject: "Mathematics", classLevel: 8, name: "Rational Numbers",
    summary: "What rational numbers are, their properties, inverses and finding numbers between two rationals.",
    material: {
      title: "Rational Numbers: key ideas",
      body: `A rational number is any number that can be written in the form p/q, where p and q are integers and q is not zero. For example 3/4, -5/7, 6 (which is 6/1) and 0 (which is 0/1) are all rational numbers. A fraction with a denominator of zero, such as 5/0, is not defined, so it is not a rational number.

Closure: when you add, subtract or multiply two rational numbers, the answer is always a rational number. Division is also closed, except that we can never divide by zero.

Commutative property: for rational numbers a and b, a + b = b + a and a × b = b × a. The order does not change the answer for addition and multiplication. Subtraction and division are not commutative: 1/2 − 1/3 is not equal to 1/3 − 1/2.

Identities and inverses: 0 is the additive identity because a + 0 = a. 1 is the multiplicative identity because a × 1 = a. The additive inverse of a/b is −a/b, because the two add to 0. The multiplicative inverse (reciprocal) of a/b, where a is not zero, is b/a, because their product is 1. For example, the reciprocal of −3/7 is −7/3.

Rational numbers between two rational numbers: there are infinitely many. To find some between 1/4 and 1/2, write both with a common denominator: 2/8 and 4/8. Now 3/8 lies between them. Using a larger common denominator, such as 16 (4/16 and 8/16), gives 5/16, 6/16 and 7/16 as well.

Number line: to mark p/q on a number line, divide each unit length into q equal parts and count p parts from zero, to the right for positive numbers and to the left for negative numbers.`,
    },
    questions: [
      { prompt: "Which of these is NOT a rational number?", options: ["3/4", "−2", "0/5", "5/0"], answer: 3, explanation: "A rational number p/q needs q ≠ 0. 5/0 has a zero denominator, so it is not defined.", difficulty: "easy" },
      { prompt: "What is the multiplicative inverse of −3/7?", options: ["3/7", "−7/3", "7/3", "−3/7"], answer: 1, explanation: "The multiplicative inverse gives a product of 1: (−3/7) × (−7/3) = 1." },
      { prompt: "What is the additive inverse of 5/9?", options: ["−5/9", "9/5", "5/9", "−9/5"], answer: 0, explanation: "The additive inverse gives a sum of 0: 5/9 + (−5/9) = 0.", difficulty: "easy" },
      { prompt: "2/3 + 1/5 = 1/5 + 2/3 shows which property?", options: ["Associative property", "Commutative property of addition", "Distributive property", "Closure property"], answer: 1, explanation: "Changing the order of the numbers being added without changing the sum is the commutative property." },
      { prompt: "Which rational number lies between 1/4 and 1/2?", options: ["1/8", "3/8", "5/8", "3/4"], answer: 1, explanation: "Write 1/4 = 2/8 and 1/2 = 4/8. 3/8 lies between 2/8 and 4/8.", difficulty: "medium" },
    ],
  },
  {
    subject: "Mathematics", classLevel: 8, name: "Linear Equations in One Variable",
    summary: "Solving equations with one variable using the balance method and forming equations from word problems.",
    material: {
      title: "Solving linear equations step by step",
      body: `A linear equation in one variable has only one variable, and the highest power of that variable is 1. Examples: 2x + 5 = 17 and 5y − 3 = 2y + 9. An equation such as x² + 1 = 5 is not linear, and 2x + 3y = 7 has two variables.

The balance method: an equation is like a balanced weighing scale. Whatever you do to one side, you must do to the other side. You may add, subtract, multiply or divide both sides by the same number (but never divide by zero).

Example: solve 2x + 5 = 17. Subtract 5 from both sides: 2x = 12. Divide both sides by 2: x = 6. Check: 2 × 6 + 5 = 17. Correct.

Variables on both sides: solve 5x − 3 = 2x + 9. Subtract 2x from both sides: 3x − 3 = 9. Add 3 to both sides: 3x = 12, so x = 4.

Brackets: solve 3(x − 2) = 12. Either divide both sides by 3 to get x − 2 = 4, so x = 6, or expand to 3x − 6 = 12, so 3x = 18 and x = 6.

Word problems: read carefully, choose a letter for the unknown, write the equation, solve and check. Example: the sum of two consecutive numbers is 41. Let the smaller number be n; the next is n + 1. So n + n + 1 = 41, 2n = 40, n = 20. The numbers are 20 and 21.`,
    },
    questions: [
      { prompt: "Solve: 2x + 5 = 17", options: ["x = 6", "x = 11", "x = 8.5", "x = 12"], answer: 0, explanation: "Subtract 5: 2x = 12. Divide by 2: x = 6.", difficulty: "easy" },
      { prompt: "Solve: 3(x − 2) = 12", options: ["x = 2", "x = 4", "x = 6", "x = 10"], answer: 2, explanation: "Divide both sides by 3: x − 2 = 4, so x = 6." },
      { prompt: "Which of these is a linear equation in one variable?", options: ["x² + 1 = 5", "2x + 3y = 7", "5x − 4 = 11", "xy = 6"], answer: 2, explanation: "5x − 4 = 11 has one variable with power 1. The others have a squared term or two variables.", difficulty: "easy" },
      { prompt: "The sum of two consecutive numbers is 41. What is the smaller number?", options: ["19", "20", "21", "22"], answer: 1, explanation: "n + (n + 1) = 41 gives 2n = 40, so n = 20 (and 20 + 21 = 41).", difficulty: "medium" },
      { prompt: "Solve: 5x − 3 = 2x + 9", options: ["x = 2", "x = 3", "x = 4", "x = 6"], answer: 2, explanation: "Subtract 2x: 3x − 3 = 9. Add 3: 3x = 12. So x = 4.", difficulty: "medium" },
    ],
  },
  {
    subject: "Mathematics", classLevel: 8, name: "Exponents and Powers",
    summary: "Laws of exponents, negative and zero exponents, and standard form for very large and very small numbers.",
    material: {
      title: "Laws of exponents and standard form",
      body: `In aⁿ, a is the base and n is the exponent. 2⁵ means 2 × 2 × 2 × 2 × 2 = 32.

Laws of exponents (for non-zero a and integers m, n): aᵐ × aⁿ = aᵐ⁺ⁿ; aᵐ ÷ aⁿ = aᵐ⁻ⁿ; (aᵐ)ⁿ = aᵐⁿ; aᵐ × bᵐ = (ab)ᵐ.

Zero exponent: any non-zero number raised to the power 0 equals 1. For example 7⁰ = 1, because 7³ ÷ 7³ = 7⁰ and also equals 1.

Negative exponents: a⁻ⁿ = 1/aⁿ. So 2⁻³ = 1/2³ = 1/8. A negative exponent does not make the number negative.

Standard form: a number is written as k × 10ⁿ where 1 ≤ k < 10. Large numbers use positive powers: 3,50,000 = 3.5 × 10⁵. Small numbers use negative powers: 0.00045 = 4.5 × 10⁻⁴, because the decimal point moves 4 places to the right.`,
    },
    questions: [
      { prompt: "What is the value of 2⁻³?", options: ["−8", "1/8", "−1/8", "8"], answer: 1, explanation: "a⁻ⁿ = 1/aⁿ, so 2⁻³ = 1/2³ = 1/8. A negative exponent does not make the value negative." },
      { prompt: "(5²)³ is equal to:", options: ["5⁵", "5⁶", "5⁸", "25⁵"], answer: 1, explanation: "(aᵐ)ⁿ = aᵐⁿ, so (5²)³ = 5⁶." },
      { prompt: "Any non-zero number raised to the power 0 equals:", options: ["0", "1", "The number itself", "It is not defined"], answer: 1, explanation: "a⁰ = 1 for any non-zero a, because aⁿ ÷ aⁿ = a⁰ = 1.", difficulty: "easy" },
      { prompt: "0.00045 in standard form is:", options: ["4.5 × 10⁻⁴", "45 × 10⁻⁵", "4.5 × 10⁴", "0.45 × 10⁻³"], answer: 0, explanation: "In standard form 1 ≤ k < 10. Moving the decimal 4 places right gives 4.5 × 10⁻⁴.", difficulty: "medium" },
      { prompt: "3⁵ ÷ 3² equals:", options: ["3⁷", "3³", "3¹⁰", "1³"], answer: 1, explanation: "aᵐ ÷ aⁿ = aᵐ⁻ⁿ, so 3⁵ ÷ 3² = 3³.", difficulty: "easy" },
    ],
  },
  {
    subject: "Science", classLevel: 8, name: "Force and Pressure",
    summary: "Pushes and pulls, contact and non-contact forces, and how pressure depends on force and area.",
    material: {
      title: "Force and pressure explained",
      body: `A force is a push or a pull on an object. A force can make an object start moving, stop, speed up, slow down, change direction or change shape.

Contact forces act only when objects touch: muscular force (when we lift a bag) and friction (which slows a rolling ball) are examples. Non-contact forces act from a distance: magnetic force, electrostatic force (a rubbed balloon attracting paper bits) and the force of gravity.

Pressure is the force acting on a unit area of a surface: pressure = force ÷ area. The SI unit of force is the newton (N) and the SI unit of pressure is the pascal (Pa), which is one newton per square metre. For example, a force of 100 N on an area of 2 m² gives a pressure of 50 Pa.

The same force produces more pressure on a smaller area. That is why a sharp knife cuts easily and a nail has a pointed tip. School bags have wide straps so that the weight is spread over a larger area of the shoulders, which reduces the pressure.

Liquids and gases also exert pressure. Liquid pressure increases with depth, which is why water spurts out farther from a hole near the bottom of a bottle, and why dams are made thicker at the bottom. The air around us exerts atmospheric pressure in all directions.`,
    },
    questions: [
      { prompt: "What is the SI unit of pressure?", options: ["Newton", "Pascal", "Joule", "Watt"], answer: 1, explanation: "Pressure is measured in pascals (Pa); 1 Pa = 1 N/m². The newton is the unit of force.", difficulty: "easy" },
      { prompt: "Which of these is a non-contact force?", options: ["Friction", "Muscular force", "Magnetic force", "The force of a kick"], answer: 2, explanation: "A magnet can attract iron without touching it, so magnetic force is a non-contact force.", difficulty: "easy" },
      { prompt: "Why do school bags have wide straps?", options: ["To make the bag heavier", "To reduce pressure on the shoulders by increasing the area", "To increase pressure on the shoulders", "Only for appearance"], answer: 1, explanation: "Pressure = force ÷ area. A larger area spreads the same weight, so the pressure on the shoulders is lower." },
      { prompt: "A force of 100 N acts on an area of 2 m². What is the pressure?", options: ["200 Pa", "50 Pa", "102 Pa", "98 Pa"], answer: 1, explanation: "Pressure = force ÷ area = 100 N ÷ 2 m² = 50 Pa.", difficulty: "medium" },
      { prompt: "As you go deeper in a liquid, the pressure:", options: ["Decreases", "Stays the same", "Increases", "Becomes zero"], answer: 2, explanation: "Liquid pressure increases with depth. This is why dams are thicker at the bottom." },
    ],
  },
  {
    subject: "Science", classLevel: 8, name: "Microorganisms: Friend and Foe",
    summary: "Groups of microorganisms, their useful roles, diseases they cause and food preservation.",
    material: {
      title: "Microorganisms: useful and harmful",
      body: `Microorganisms (microbes) are living things too small to be seen with the naked eye. The main groups are bacteria, fungi, protozoa and some algae. Viruses are also microscopic, but they can reproduce only inside the cells of another living organism.

Useful microorganisms: the bacterium Lactobacillus turns milk into curd. Yeast, a fungus, is used in baking: during fermentation it produces carbon dioxide gas, which makes the dough rise. Some microbes are used to make antibiotics and vaccines. Rhizobium bacteria live in the root nodules of leguminous plants (pulses such as peas and beans) and fix nitrogen from the air, which enriches the soil.

Harmful microorganisms: microbes that cause disease are called pathogens. Cholera and typhoid are caused by bacteria. Malaria is caused by a protozoan (Plasmodium) and is spread by the female Anopheles mosquito. The common cold and influenza are caused by viruses.

Food preservation stops microbes from spoiling food. Common methods are adding salt, sugar or oil, heating and cooling, and keeping food in airtight containers. In pasteurisation, discovered by Louis Pasteur, milk is heated to about 70°C for 15 to 30 seconds and then suddenly chilled and stored.`,
    },
    questions: [
      { prompt: "Which bacterium helps turn milk into curd?", options: ["Rhizobium", "Lactobacillus", "Plasmodium", "Yeast"], answer: 1, explanation: "Lactobacillus converts milk into curd. Yeast is a fungus, Plasmodium is a protozoan and Rhizobium fixes nitrogen.", difficulty: "easy" },
      { prompt: "Malaria is caused by a:", options: ["Virus", "Bacterium", "Protozoan", "Fungus"], answer: 2, explanation: "Malaria is caused by the protozoan Plasmodium, spread by the female Anopheles mosquito." },
      { prompt: "Why is yeast added to bread dough?", options: ["It produces carbon dioxide, which makes the dough rise", "It adds salt", "It kills bacteria", "It adds colour"], answer: 0, explanation: "During fermentation yeast releases carbon dioxide gas. The gas bubbles make the dough rise.", difficulty: "easy" },
      { prompt: "Rhizobium bacteria live in the root nodules of:", options: ["Wheat", "Leguminous plants (pulses)", "Rice", "Maize"], answer: 1, explanation: "Rhizobium lives in the root nodules of legumes such as peas and beans and fixes atmospheric nitrogen." },
      { prompt: "Pasteurisation of milk involves:", options: ["Freezing the milk", "Heating to about 70°C for 15–30 seconds, then chilling", "Adding salt", "Drying the milk"], answer: 1, explanation: "Milk is heated to about 70°C for 15 to 30 seconds and then suddenly chilled, which kills most harmful microbes.", difficulty: "medium" },
    ],
  },
  {
    subject: "English", classLevel: 8, name: "Active and Passive Voice",
    summary: "Changing sentences between active and passive voice across tenses, and when to use the passive.",
    material: {
      title: "Active and passive voice",
      body: `In the active voice, the subject does the action: "Riya wrote a letter." In the passive voice, the subject receives the action: "A letter was written by Riya."

To form the passive, use the correct form of "be" plus the past participle (third form) of the verb. The object of the active sentence becomes the subject of the passive sentence.

Tense patterns: simple present: is/am/are + past participle ("The plants are watered by the gardener."). Simple past: was/were + past participle. Present continuous: is/am/are being + past participle ("A story is being written by her."). Present perfect: has/have been + past participle ("The project has been completed by them."). Simple future: will be + past participle.

When to use the passive voice: when the doer is unknown ("My bicycle was stolen."), not important, or obvious ("The road is being repaired."). Only sentences with an object (transitive verbs) can be changed into the passive voice.`,
    },
    questions: [
      { prompt: 'Passive of: "The gardener waters the plants."', options: ["The plants are watered by the gardener.", "The plants were watered by the gardener.", "The plants is watered by the gardener.", "The gardener is watered by the plants."], answer: 0, explanation: "Simple present passive uses are + past participle, and 'plants' is plural.", difficulty: "easy" },
      { prompt: 'Passive of: "She is writing a story."', options: ["A story is written by her.", "A story is being written by her.", "A story was being written by her.", "A story has been written by her."], answer: 1, explanation: "Present continuous passive uses is/am/are + being + past participle." },
      { prompt: "Which sentence is in the passive voice?", options: ["The dog chased the cat.", "The match was won by our team.", "We will visit Ranchi.", "They have finished their homework."], answer: 1, explanation: "In 'The match was won by our team', the subject (match) receives the action.", difficulty: "easy" },
      { prompt: 'Passive of: "They have completed the project."', options: ["The project has been completed by them.", "The project was completed by them.", "The project is completed by them.", "The project had completed by them."], answer: 0, explanation: "Present perfect passive uses has/have + been + past participle." },
      { prompt: "The passive voice is most useful when:", options: ["The doer of the action is unknown or less important", "The sentence is a question", "The verb has no object", "The sentence is very short"], answer: 0, explanation: "We use the passive when the doer is unknown, unimportant or obvious, e.g. 'My bicycle was stolen.'", difficulty: "medium" },
    ],
  },
  {
    subject: "Social Science", classLevel: 8, name: "The Indian Constitution",
    summary: "How the Constitution was made, its key features and the Fundamental Rights.",
    material: {
      title: "The Indian Constitution: an overview",
      body: `The Constitution of India was written by the Constituent Assembly. Dr B. R. Ambedkar was the Chairman of its Drafting Committee. The Constitution was adopted on 26 November 1949 and came into effect on 26 January 1950, which we celebrate as Republic Day.

Key features: federalism (powers are shared between the Union and the States); a parliamentary form of government in which representatives are elected by the people; separation of powers between the three organs of government (the legislature makes laws, the executive implements them and the judiciary interprets them and settles disputes); and secularism, which means the State does not favour any one religion.

Fundamental Rights protect citizens: the Right to Equality, the Right to Freedom, the Right against Exploitation, the Right to Freedom of Religion, Cultural and Educational Rights, and the Right to Constitutional Remedies. The Right to Constitutional Remedies allows citizens to approach the courts if any of their Fundamental Rights are violated.

The Constitution also lists Fundamental Duties, such as respecting the national flag and anthem, protecting public property and the environment, and promoting harmony.`,
    },
    questions: [
      { prompt: "The Indian Constitution came into effect on:", options: ["15 August 1947", "26 January 1950", "26 November 1949", "2 October 1950"], answer: 1, explanation: "It was adopted on 26 November 1949 and came into effect on 26 January 1950 (Republic Day).", difficulty: "easy" },
      { prompt: "Who was the Chairman of the Drafting Committee?", options: ["Jawaharlal Nehru", "Dr B. R. Ambedkar", "Dr Rajendra Prasad", "Sardar Vallabhbhai Patel"], answer: 1, explanation: "Dr B. R. Ambedkar chaired the Drafting Committee of the Constituent Assembly.", difficulty: "easy" },
      { prompt: "The three organs of government are:", options: ["Legislature, executive and judiciary", "Centre, state and panchayat", "President, Prime Minister and Governor", "Police, army and courts"], answer: 0, explanation: "Separation of powers divides government into the legislature, the executive and the judiciary." },
      { prompt: "The Right to Constitutional Remedies allows citizens to:", options: ["Vote in elections", "Go to the courts if their Fundamental Rights are violated", "Form associations", "Practise any religion"], answer: 1, explanation: "It lets citizens approach the courts to protect their Fundamental Rights.", difficulty: "medium" },
      { prompt: "In the Indian Constitution, secularism means that:", options: ["The State promotes one religion", "The State does not favour any religion", "Religion is banned", "Only the majority religion is protected"], answer: 1, explanation: "A secular State treats all religions equally and does not favour any one of them." },
    ],
  },
  {
    subject: "Computer Science", classLevel: 8, name: "Algorithms and Flowcharts",
    summary: "Writing clear step-by-step algorithms and drawing them with standard flowchart symbols.",
    material: {
      title: "Algorithms and flowcharts",
      body: `An algorithm is a finite sequence of clear, step-by-step instructions to solve a problem. A good algorithm is finite (it ends), definite (every step is unambiguous), takes input, produces output and is effective (each step can actually be carried out).

Example algorithm to find the larger of two numbers: 1. Start. 2. Read A and B. 3. If A > B, print A; otherwise print B. 4. Stop.

A flowchart is a diagram of an algorithm. Standard symbols: an oval (terminal) shows Start or Stop; a parallelogram shows input or output; a rectangle shows a process such as a calculation; a diamond shows a decision with Yes/No branches; arrows (flow lines) show the order of steps.

Algorithms come before programs: once the steps are clear, they can be written in any programming language, such as Python.`,
    },
    questions: [
      { prompt: "In a flowchart, the diamond symbol is used for:", options: ["A process", "A decision", "Input or output", "Start or stop"], answer: 1, explanation: "A diamond shows a decision with Yes/No branches.", difficulty: "easy" },
      { prompt: "Which symbol shows Start or Stop?", options: ["Rectangle", "Oval", "Diamond", "Parallelogram"], answer: 1, explanation: "The oval (terminal) symbol marks Start and Stop.", difficulty: "easy" },
      { prompt: "Which is NOT a property of a good algorithm?", options: ["It is finite", "Its steps are unambiguous", "It runs forever", "It produces output"], answer: 2, explanation: "An algorithm must end after a finite number of steps." },
      { prompt: "Which symbol is used for input or output?", options: ["Parallelogram", "Rectangle", "Oval", "Circle"], answer: 0, explanation: "A parallelogram represents input (e.g. Read A) or output (e.g. Print B)." },
      { prompt: "An algorithm is best described as:", options: ["A programming language", "A finite sequence of clear steps to solve a problem", "A part of the computer", "A type of flowchart symbol"], answer: 1, explanation: "An algorithm is a step-by-step method; it can later be written in any programming language.", difficulty: "easy" },
    ],
  },
  {
    subject: "Science", classLevel: 7, name: "Nutrition in Plants",
    summary: "Photosynthesis, the starch test, and other modes of nutrition in plants.",
    material: {
      title: "How plants make and get food",
      body: `Green plants make their own food, so they are called autotrophs. This process is photosynthesis. It happens mainly in the leaves, which contain the green pigment chlorophyll that captures energy from sunlight.

For photosynthesis plants need carbon dioxide, which enters through tiny pores called stomata on the leaves, and water, which is absorbed by the roots and carried up through the stem. Using sunlight, the leaf makes carbohydrates (food) and releases oxygen. The carbohydrate is stored as starch.

Starch test: when a few drops of iodine solution are put on a substance containing starch, it turns blue-black.

Other modes of nutrition: Cuscuta (amarbel) is a parasite that takes food from a host plant. Insectivorous plants such as the pitcher plant trap insects to obtain extra nutrients. Fungi are saprotrophs that absorb nutrients from dead and decaying matter. In a lichen, an alga and a fungus live together and help each other; this partnership is called symbiosis.`,
    },
    questions: [
      { prompt: "Tiny pores on leaves through which gases are exchanged are called:", options: ["Stomata", "Chlorophyll", "Xylem", "Roots"], answer: 0, explanation: "Carbon dioxide enters and oxygen leaves through stomata.", difficulty: "easy" },
      { prompt: "Photosynthesis produces:", options: ["Carbohydrate and oxygen", "Carbon dioxide and water", "Protein only", "Nitrogen"], answer: 0, explanation: "Using sunlight, carbon dioxide and water, the leaf makes carbohydrate and releases oxygen." },
      { prompt: "Iodine solution turns starch:", options: ["Red", "Blue-black", "Yellow", "Green"], answer: 1, explanation: "A blue-black colour with iodine shows that starch is present.", difficulty: "easy" },
      { prompt: "Cuscuta (amarbel) is an example of a:", options: ["Autotroph", "Parasite", "Insectivorous plant", "Saprotroph"], answer: 1, explanation: "Cuscuta takes its food from a host plant, so it is a parasite." },
      { prompt: "A lichen is a partnership between:", options: ["An alga and a fungus", "A fungus and a bacterium", "Two flowering plants", "A plant and an insect"], answer: 0, explanation: "In a lichen the alga makes food and the fungus provides shelter, water and minerals: symbiosis.", difficulty: "medium" },
    ],
  },
  {
    subject: "Mathematics", classLevel: 6, name: "Integers",
    summary: "Positive and negative numbers, comparing integers and adding and subtracting them.",
    material: {
      title: "Getting to know integers",
      body: `Integers are the whole numbers and their negatives: …, −3, −2, −1, 0, 1, 2, 3, … Zero is neither positive nor negative.

We use negative numbers in daily life: 5 metres below sea level is −5 m, and a temperature of 3 degrees below zero is −3°C.

On a number line, numbers increase as we move to the right. So any number is greater than every number to its left: −2 > −5, and every positive number is greater than every negative number.

Adding integers: with the same signs, add and keep the sign (−3 + −4 = −7). With different signs, subtract the smaller number (ignoring signs) from the larger and keep the sign of the larger (−8 + 5 = −3).

Subtracting an integer is the same as adding its additive inverse: 3 − (−4) = 3 + 4 = 7. The additive inverse of −9 is 9, because −9 + 9 = 0.`,
    },
    questions: [
      { prompt: "Which is the greatest?", options: ["−7", "−2", "−10", "−5"], answer: 1, explanation: "On the number line −2 is to the right of −5, −7 and −10, so it is the greatest.", difficulty: "easy" },
      { prompt: "−8 + 5 = ?", options: ["−13", "−3", "3", "13"], answer: 1, explanation: "Different signs: 8 − 5 = 3, and the larger number (8) is negative, so the answer is −3." },
      { prompt: "3 − (−4) = ?", options: ["−1", "1", "7", "−7"], answer: 2, explanation: "Subtracting −4 is the same as adding 4: 3 + 4 = 7.", difficulty: "medium" },
      { prompt: "Which integer shows 5 metres below sea level?", options: ["5", "−5", "0", "50"], answer: 1, explanation: "Below sea level is shown with a negative sign: −5 m.", difficulty: "easy" },
      { prompt: "What is the additive inverse of −9?", options: ["9", "−9", "0", "1/9"], answer: 0, explanation: "−9 + 9 = 0, so 9 is the additive inverse of −9." },
    ],
  },
];

export const DRAFT_MATERIAL = {
  topic: "Force and Pressure",
  title: "Atmospheric pressure: classroom activity (draft)",
  body: `Activity: fill a glass to the brim with water and cover it with a stiff postcard. Hold the card and turn the glass upside down over a tray, then remove your hand.

The card stays in place because air pressure pushing up on the card is greater than the pressure of the water pushing down.

Teacher note: check that the card is flat and the rim is wet; do the activity over a tray.`,
};

// ─── Admissions knowledge base (public sources only) ────────────────────────

const SITE = "https://www.mananvidya.com";
export const KB = [
  {
    category: "About the school", keywords: "about,history,founded,established,school,co-educational,english medium,cbse",
    question_en: "Tell me about the school. When was it founded?",
    answer_en: "Manan Vidya Manrakhan Mahto School is a co-educational, English-medium school in Ranchi, Jharkhand, affiliated to the Central Board of Secondary Education (CBSE). The school's website states that it came into existence on 22 April 2007 and describes it as a senior secondary residential school.",
    question_hi: "स्कूल के बारे में बताइए। इसकी स्थापना कब हुई?",
    answer_hi: "मनन विद्या मनरखन महतो स्कूल रांची, झारखंड में एक सह-शिक्षा, अंग्रेज़ी माध्यम का स्कूल है, जो केंद्रीय माध्यमिक शिक्षा बोर्ड (CBSE) से संबद्ध है। स्कूल की वेबसाइट के अनुसार इसकी स्थापना 22 अप्रैल 2007 को हुई थी और इसे सीनियर सेकेंडरी आवासीय स्कूल बताया गया है।",
    source: `${SITE}/About/MananVidya`, verification: "public_source",
  },
  {
    category: "Affiliation", keywords: "affiliation,affiliated,cbse,board,school code,number",
    question_en: "Which board is the school affiliated to? What is the affiliation number?",
    answer_en: "The school is affiliated to CBSE. The school's website lists Affiliation No. 3430236 and School Code 66430.",
    question_hi: "स्कूल किस बोर्ड से संबद्ध है? संबद्धता संख्या क्या है?",
    answer_hi: "स्कूल CBSE से संबद्ध है। स्कूल की वेबसाइट पर संबद्धता संख्या 3430236 और स्कूल कोड 66430 दिया गया है।",
    source: SITE, verification: "public_source",
  },
  {
    category: "Location", keywords: "address,location,where,located,reach,map,ranchi,booti,dumardaga",
    question_en: "Where is the school located?",
    answer_en: "The address on the school's website is: Dumardaga, Near Zumar Bridge, H.B. Road, Booti, Ranchi 834012, Jharkhand. The website describes the campus as beside NH-33.",
    question_hi: "स्कूल कहाँ स्थित है?",
    answer_hi: "स्कूल की वेबसाइट पर पता: डुमरदगा, ज़ुमार ब्रिज के पास, एच.बी. रोड, बूटी, रांची 834012, झारखंड। वेबसाइट के अनुसार परिसर NH-33 के पास है।",
    source: `${SITE}/Contact/us`, verification: "public_source",
  },
  {
    category: "Contact", keywords: "contact,phone,call,number,email,mobile,office",
    question_en: "How can I contact the school office?",
    answer_en: "The school's website lists phone 0651-2273600/601, mobile numbers 9771162698, 6202910308 and 6202910307, and email mananvidya@gmail.com. You can also leave an enquiry here and the admissions team will contact you.",
    question_hi: "स्कूल कार्यालय से कैसे संपर्क करें?",
    answer_hi: "स्कूल की वेबसाइट पर फ़ोन 0651-2273600/601, मोबाइल 9771162698, 6202910308 और 6202910307 तथा ईमेल mananvidya@gmail.com दिए गए हैं। आप यहाँ पूछताछ भी दर्ज कर सकते हैं, प्रवेश टीम आपसे संपर्क करेगी।",
    source: `${SITE}/Contact/us`, verification: "public_source",
  },
  {
    category: "Admissions", keywords: "classes,class,grade,nursery,kg,prep,which classes,offered,levels",
    question_en: "Which classes can I apply for?",
    answer_en: "The school's admission page describes admission from Nursery to Class XI, subject to seat availability. The online enquiry form lists KG, Prep and Classes I to XI. Please confirm current vacancies with the admissions office.",
    question_hi: "किन कक्षाओं में प्रवेश के लिए आवेदन कर सकते हैं?",
    answer_hi: "स्कूल के प्रवेश पृष्ठ पर नर्सरी से कक्षा XI तक प्रवेश की जानकारी है, जो सीटों की उपलब्धता पर निर्भर है। ऑनलाइन पूछताछ फ़ॉर्म में KG, Prep और कक्षा I से XI दी गई हैं। वर्तमान रिक्तियों की पुष्टि प्रवेश कार्यालय से करें।",
    source: `${SITE}/About/admission`, verification: "public_source",
  },
  {
    category: "Admissions", keywords: "admission process,apply,application,procedure,steps,registration,form,how to apply,enrol,enroll",
    question_en: "What is the admission process?",
    answer_en: "According to the school's website: 1) obtain the registration form online or from the school office; 2) submit the completed form with the required documents to the Admission Counsellor; 3) the child attends an interaction, entrance test, age verification and/or document verification on a date sent by SMS; 4) complete the enrolment formalities. Incomplete forms are not accepted. Selection depends on seat availability, previous academic record, the entrance test and an interaction with parents.",
    question_hi: "प्रवेश प्रक्रिया क्या है?",
    answer_hi: "स्कूल की वेबसाइट के अनुसार: 1) पंजीकरण फ़ॉर्म ऑनलाइन या स्कूल कार्यालय से प्राप्त करें; 2) भरा हुआ फ़ॉर्म आवश्यक दस्तावेज़ों के साथ प्रवेश परामर्शदाता को जमा करें; 3) बच्चा SMS द्वारा भेजी गई तारीख पर बातचीत, प्रवेश परीक्षा, आयु सत्यापन और/या दस्तावेज़ सत्यापन में भाग लेता है; 4) नामांकन औपचारिकताएँ पूरी करें। अधूरे फ़ॉर्म स्वीकार नहीं किए जाते। चयन सीटों की उपलब्धता, पिछले शैक्षणिक रिकॉर्ड, प्रवेश परीक्षा और अभिभावकों से बातचीत पर निर्भर करता है।",
    source: `${SITE}/About/admission`, verification: "public_source",
  },
  {
    category: "Admissions", keywords: "age,age criteria,eligibility,how old,years old,nursery age,class 1 age,kg age",
    question_en: "What is the age criteria for admission?",
    answer_en: "The school's website gives these ages as on 31 March: Nursery 3–4 years, KG 4–5 years, Prep 5–6 years, Class I 6–7 years. Age criteria for other classes are not listed; please ask the admissions office.",
    question_hi: "प्रवेश के लिए आयु मानदंड क्या है?",
    answer_hi: "स्कूल की वेबसाइट के अनुसार 31 मार्च को आयु: नर्सरी 3–4 वर्ष, KG 4–5 वर्ष, Prep 5–6 वर्ष, कक्षा I 6–7 वर्ष। अन्य कक्षाओं के आयु मानदंड नहीं दिए गए हैं; कृपया प्रवेश कार्यालय से पूछें।",
    source: `${SITE}/About/admission`, verification: "public_source",
  },
  {
    category: "Admissions", keywords: "documents,papers,certificate,birth certificate,aadhaar,aadhar,photo,transfer certificate,tc,report card,required",
    question_en: "Which documents are required for admission?",
    answer_en: "The school's website lists self-attested copies of: passport-size photographs of the parents and the child; the child's birth certificate; address proof; Aadhaar cards of the parents and the child; the report card of the previous class; and a Transfer Certificate, if required.",
    question_hi: "प्रवेश के लिए कौन से दस्तावेज़ चाहिए?",
    answer_hi: "स्कूल की वेबसाइट के अनुसार स्व-सत्यापित प्रतियाँ: अभिभावकों और बच्चे की पासपोर्ट आकार की फ़ोटो; बच्चे का जन्म प्रमाण पत्र; पते का प्रमाण; अभिभावकों और बच्चे का आधार कार्ड; पिछली कक्षा का रिपोर्ट कार्ड; और आवश्यक होने पर स्थानांतरण प्रमाण पत्र (TC)।",
    source: `${SITE}/About/admission`, verification: "public_source",
  },
  {
    category: "Admissions", keywords: "class 11,class xi,eleventh,stream,science,commerce,humanities,arts,pcm,pcb,subjects,60%",
    question_en: "What are the Class XI admission requirements and streams?",
    answer_en: "According to the school's website, Class XI forms (Science, Commerce and Humanities) are available at the school office from 9 am to 4 pm and are issued to students with at least 60% aggregate in their board examination. Subject combinations are allotted by the school based on board or entrance test performance and cannot be changed afterwards. Physical and Health Education (PHE) is part of every stream.",
    question_hi: "कक्षा XI में प्रवेश की आवश्यकताएँ और स्ट्रीम क्या हैं?",
    answer_hi: "स्कूल की वेबसाइट के अनुसार कक्षा XI के फ़ॉर्म (विज्ञान, वाणिज्य और मानविकी) स्कूल कार्यालय में सुबह 9 बजे से शाम 4 बजे तक उपलब्ध हैं और बोर्ड परीक्षा में कम से कम 60% कुल अंक वाले विद्यार्थियों को दिए जाते हैं। विषय संयोजन बोर्ड या प्रवेश परीक्षा के प्रदर्शन के आधार पर स्कूल तय करता है और बाद में बदले नहीं जा सकते। शारीरिक एवं स्वास्थ्य शिक्षा (PHE) हर स्ट्रीम का हिस्सा है।",
    source: `${SITE}/About/admission`, verification: "public_source",
  },
  {
    category: "Boarding", keywords: "hostel,boarding,boarder,residential,stay,accommodation,dormitory,girls hostel,boys hostel",
    question_en: "Does the school have hostel or boarding facilities?",
    answer_en: "Yes. The school's website states that hostel facilities are available for both boys and girls. Details such as hostel fees, rules and capacity are not published on the website, so the admissions team will share them with you.",
    question_hi: "क्या स्कूल में हॉस्टल या बोर्डिंग की सुविधा है?",
    answer_hi: "हाँ। स्कूल की वेबसाइट के अनुसार लड़कों और लड़कियों दोनों के लिए हॉस्टल सुविधा उपलब्ध है। हॉस्टल शुल्क, नियम और क्षमता वेबसाइट पर प्रकाशित नहीं हैं, इसलिए प्रवेश टीम आपको यह जानकारी देगी।",
    source: `${SITE}/About/MananVidya`, verification: "public_source",
  },
  {
    category: "Facilities", keywords: "facilities,library,sports,laboratory,lab,cafeteria,canteen,transport,medical,infrastructure",
    question_en: "What facilities does the school have?",
    answer_en: "The school's website lists a library, sports, laboratories, a cafeteria, transport, medical care, boarding and sustainability initiatives. The campus is described as 2.42 acres with a 25,500 sq ft playground.",
    question_hi: "स्कूल में कौन-कौन सी सुविधाएँ हैं?",
    answer_hi: "स्कूल की वेबसाइट पर पुस्तकालय, खेलकूद, प्रयोगशालाएँ, कैफ़ेटेरिया, परिवहन, चिकित्सा सुविधा, बोर्डिंग और पर्यावरण पहल का उल्लेख है। परिसर 2.42 एकड़ का बताया गया है, जिसमें 25,500 वर्ग फुट का खेल मैदान है।",
    source: SITE, verification: "public_source",
  },
  {
    category: "Activities", keywords: "activities,co-curricular,extracurricular,sports,music,dance,art,cricket,football,soccer,martial arts",
    question_en: "What co-curricular activities are offered?",
    answer_en: "The school's website mentions athletics, martial arts, performing and visual arts, dance, vocal and instrumental music, soccer and cricket.",
    question_hi: "कौन-कौन सी सह-पाठ्यक्रम गतिविधियाँ हैं?",
    answer_hi: "स्कूल की वेबसाइट पर एथलेटिक्स, मार्शल आर्ट्स, प्रदर्शन और दृश्य कला, नृत्य, गायन और वाद्य संगीत, फ़ुटबॉल और क्रिकेट का उल्लेख है।",
    source: `${SITE}/About/MananVidya`, verification: "public_source",
  },
  {
    category: "Transport", keywords: "transport,bus,van,pick up,drop,route,routes",
    question_en: "Is school transport available?",
    answer_en: "Transport is listed among the school's facilities on its website, but routes and charges are not published. The admissions team can confirm whether your area is covered.",
    question_hi: "क्या स्कूल परिवहन उपलब्ध है?",
    answer_hi: "स्कूल की वेबसाइट पर परिवहन सुविधा का उल्लेख है, लेकिन रूट और शुल्क प्रकाशित नहीं हैं। प्रवेश टीम बता सकती है कि आपका क्षेत्र शामिल है या नहीं।",
    source: SITE, verification: "public_source",
  },
  {
    category: "Academics", keywords: "book list,books,booklist,textbooks,stationery",
    question_en: "Where can I find the book list?",
    answer_en: "The school's website has a Book List for 2026–27 in its Useful Links / Downloads section.",
    question_hi: "पुस्तक सूची कहाँ मिलेगी?",
    answer_hi: "स्कूल की वेबसाइट के उपयोगी लिंक / डाउनलोड अनुभाग में 2026–27 की पुस्तक सूची उपलब्ध है।",
    source: SITE, verification: "public_source",
  },
  {
    category: "Academics", keywords: "student teacher ratio,ratio,class size,section size,students per class",
    question_en: "What is the class size and student–teacher ratio?",
    answer_en: "The school's public website gives different figures on different pages, so this answer is held back until the school confirms it. The admissions team will answer this question personally.",
    question_hi: "कक्षा का आकार और छात्र-शिक्षक अनुपात क्या है?",
    answer_hi: "स्कूल की वेबसाइट पर अलग-अलग पृष्ठों पर अलग आंकड़े हैं, इसलिए स्कूल की पुष्टि तक यह उत्तर रोका गया है। प्रवेश टीम व्यक्तिगत रूप से उत्तर देगी।",
    source: `${SITE} (home page states 20:1; ${SITE}/About/MananVidya states 1:30 and max 42 per section)`, verification: "pending_school", published: false,
  },
] as const;

// ─── Coding, AI literacy and robotics ───────────────────────────────────────

export const CODING_LESSONS = [
  {
    track: "python", slug: "py-hello", title: "Python 1: Your first program", level: "beginner",
    body: `Python is a programming language that reads almost like English. The print() function shows text on the screen.\n\n    print("Hello!")\n\nA variable stores a value so you can use it later:\n\n    school = "Manan Vidya"\n    print("Hello, " + school + "!")`,
    challenges: [
      { slug: "py-greeting", title: "Print a greeting", kind: "python", prompt: 'Store the text Manan Vidya in a variable called school, then print exactly: Hello, Manan Vidya!', starter: 'school = ""\nprint("Hello, " + school + "!")\n', spec: { stdout: "Hello, Manan Vidya!" }, hint: "Put the school name between the quotes on the first line." },
    ],
  },
  {
    track: "python", slug: "py-loops", title: "Python 2: Loops and functions", level: "beginner",
    body: `A function is a named set of steps. A for loop repeats steps.\n\n    def total(n):\n        s = 0\n        for i in range(1, n + 1):\n            s = s + i\n        return s\n\nrange(1, n + 1) gives the numbers 1, 2, …, n.`,
    challenges: [
      { slug: "py-sum", title: "Add the numbers 1 to n", kind: "python", prompt: "Complete total(n) so it returns 1 + 2 + … + n. For example total(5) is 15.", starter: "def total(n):\n    s = 0\n    # your loop here\n    return s\n", spec: { tests: [{ call: "total(5)", expected: "15" }, { call: "total(1)", expected: "1" }, { call: "total(100)", expected: "5050" }] }, hint: "Use for i in range(1, n + 1): and add i to s." },
      { slug: "py-average", title: "Average of marks", kind: "python", prompt: "Complete average(marks) so it returns the average of a list of numbers, rounded to 1 decimal place.", starter: "def average(marks):\n    # your code here\n    return 0\n", spec: { tests: [{ call: "average([80, 90, 70])", expected: "80.0" }, { call: "average([45, 50])", expected: "47.5" }, { call: "average([33, 34, 34])", expected: "33.7" }] }, hint: "sum(marks) / len(marks), then round(value, 1)." },
    ],
  },
  {
    track: "web", slug: "web-html", title: "Web 1: Building a web page with HTML", level: "beginner",
    body: `Web pages are written in HTML. Tags describe each part of the page:\n\n    <h1>Main heading</h1>\n    <p>A paragraph of text.</p>\n    <ul>\n      <li>List item</li>\n    </ul>`,
    challenges: [
      { slug: "web-club-page", title: "Make a club page", kind: "html", prompt: "Build a page for a school club: one main heading (h1), at least one paragraph, and a list (ul) with at least three activities.", starter: "<h1></h1>\n<p></p>\n<ul>\n  <li></li>\n</ul>\n", spec: { checks: [{ selector: "h1", min: 1, label: "Has a main heading (h1) with text" }, { selector: "p", min: 1, label: "Has a paragraph" }, { selector: "ul li", min: 3, label: "Has a list with at least 3 items" }] }, hint: "Each <li> is one list item. Make sure the tags have text inside." },
    ],
  },
  {
    track: "web", slug: "web-js", title: "Web 2: JavaScript functions", level: "beginner",
    body: `JavaScript makes web pages interactive. A function takes inputs and returns an output:\n\n    function double(n) {\n      return n * 2;\n    }\n\nThe % operator gives the remainder: 7 % 2 is 1.`,
    challenges: [
      { slug: "js-even", title: "Is it even?", kind: "javascript", prompt: "Complete isEven(n) so it returns true when n is even and false when it is odd.", starter: "function isEven(n) {\n  // your code here\n}\n", spec: { fn: "isEven", tests: [{ args: [4], expected: true }, { args: [7], expected: false }, { args: [0], expected: true }] }, hint: "A number is even when n % 2 === 0." },
      { slug: "js-grade", title: "Grade from marks", kind: "javascript", prompt: "Complete grade(marks): return 'A' for 80 and above, 'B' for 60–79, 'C' for 40–59 and 'D' below 40.", starter: "function grade(marks) {\n  // your code here\n}\n", spec: { fn: "grade", tests: [{ args: [92], expected: "A" }, { args: [80], expected: "A" }, { args: [65], expected: "B" }, { args: [40], expected: "C" }, { args: [12], expected: "D" }] }, hint: "Use if / else if, starting from the highest band." },
    ],
  },
  {
    track: "ai_literacy", slug: "ai-what", title: "AI 1: What is artificial intelligence?", level: "beginner",
    body: `Artificial intelligence (AI) is a set of computer techniques that let machines do tasks that usually need human thinking: recognising speech, spotting patterns in pictures, translating languages or suggesting answers.\n\nAI systems learn patterns from large amounts of data. They do not "understand" like people do, and they can be wrong. A chatbot can write confident sentences that are false, so we always check important facts with a trusted source or a teacher.`,
    challenges: [
      { slug: "ai-check-1", title: "Check your understanding", kind: "mcq", prompt: "Answer all three questions.", starter: "", spec: { questions: [{ q: "An AI chatbot gives you a confident answer. What should you do?", options: ["Trust it completely", "Check important facts with a trusted source or teacher", "Copy it into your homework", "Share it with everyone"], answer: 1 }, { q: "How do most AI systems learn?", options: ["By finding patterns in large amounts of data", "By reading minds", "They never learn", "By guessing randomly every time"], answer: 0 }, { q: "Which task is an example of AI?", options: ["A light switch", "A calculator adding 2 + 2", "An app recognising spoken words", "A ruler"], answer: 2 }] }, hint: "Re-read the lesson: AI learns patterns and can be wrong." },
    ],
  },
  {
    track: "ai_literacy", slug: "ai-responsible", title: "AI 2: Using AI responsibly", level: "beginner",
    body: `Using AI well means: protect your privacy (never share your full name, phone number, address or photos with an AI tool); be honest (tell your teacher when you used AI to help); check facts; and watch for bias, because AI learns from data that can be unfair to some groups of people.`,
    challenges: [
      { slug: "ai-check-2", title: "Responsible AI quiz", kind: "mcq", prompt: "Answer all three questions.", starter: "", spec: { questions: [{ q: "Which information is safe to type into a public AI chatbot?", options: ["Your home address", "Your phone number", "A general question about photosynthesis", "Your friend's photo"], answer: 2 }, { q: "If you used AI to help with an assignment, you should:", options: ["Hide it", "Tell your teacher how you used it", "Say a friend did it", "Delete your work"], answer: 1 }, { q: "Why can AI be biased?", options: ["It learns from data that may be unfair", "It is always fair", "It chooses to be unfair", "Bias is impossible in computers"], answer: 0 }] }, hint: "Privacy, honesty, fact-checking and bias." },
    ],
  },
  {
    track: "robotics", slug: "robot-moves", title: "Robotics 1: Sequences of commands", level: "beginner",
    body: `A robot follows instructions exactly, in order. Our virtual robot understands:\n\n    forward 2   (move forward two squares)\n    left        (turn left)\n    right       (turn right)\n\nPlan the route on paper first, then write the commands. If the robot hits a wall, find the line that caused it.`,
    challenges: [
      { slug: "robot-first-route", title: "Reach the goal", kind: "robot", prompt: "Guide the robot (facing East) to the green goal square without hitting a wall.", starter: "forward 3\n", spec: { grid: ["#######", "#S...##", "####.##", "####..G", "#######"], start: { x: 1, y: 1, dir: "E" } }, hint: "Go forward 3, turn right, go down 2, turn left, then forward 2." },
    ],
  },
  {
    track: "robotics", slug: "robot-loops", title: "Robotics 2: Loops save effort", level: "beginner",
    body: `When a pattern repeats, use a loop:\n\n    repeat 4 {\n      forward 2\n      right\n    }\n\nThis draws a square. Loops make programs shorter and easier to fix.`,
    challenges: [
      { slug: "robot-staircase", title: "Climb the staircase", kind: "robot", prompt: "The robot starts at the bottom-left, facing North. Use repeat to climb the staircase to the goal at the top-right.", starter: "repeat 1 {\n  forward\n}\n", spec: { grid: ["#####.G", "####..#", "###..##", "##..###", "#..####", "..#####", "S######"], start: { x: 0, y: 6, dir: "N" }, maxSteps: 60 }, hint: "Each step is: forward, right, forward, left. Repeat it 6 times." },
    ],
  },
  {
    track: "robotics", slug: "iot-sensors", title: "IoT 1: Sensors and decisions", level: "intermediate",
    body: `An IoT (Internet of Things) device reads sensors and decides what to do. For example, a classroom fan controller might read temperature (°C) and humidity (%) and switch the fan on when it is hot.\n\nThe logic is written as code first and tested in software. Connecting it to a real sensor and fan needs hardware (a microcontroller board, sensor and relay), which is planned separately.`,
    challenges: [
      { slug: "iot-fan", title: "Smart fan controller", kind: "javascript", prompt: "Complete fanSetting(temp, humidity): return 'HIGH' if temp >= 32, 'LOW' if temp >= 26 or humidity >= 80, otherwise 'OFF'.", starter: "function fanSetting(temp, humidity) {\n  // your code here\n}\n", spec: { fn: "fanSetting", tests: [{ args: [35, 40], expected: "HIGH" }, { args: [28, 50], expected: "LOW" }, { args: [24, 85], expected: "LOW" }, { args: [22, 50], expected: "OFF" }] }, hint: "Check the HIGH condition first, then LOW, then return OFF." },
    ],
  },
] as const;

export const PROJECTS = [
  { track: "python", title: "Class marks analyser", brief: "Write a Python program that reads a list of (synthetic) marks and prints the average, the highest and lowest marks and how many students scored above 75.", deliverables: "Python file, sample output, a short note on how you tested it.", hardware_needed: "" },
  { track: "web", title: "Our school club website", brief: "Design a 3-page website for a school club with HTML and CSS: home, activities and a contact form mock-up.", deliverables: "HTML/CSS files and screenshots on a phone and a laptop.", hardware_needed: "" },
  { track: "ai_literacy", title: "Spot the AI mistake", brief: "Ask an approved AI tool five questions about a topic you know well. Record which answers were correct, which were wrong, and how you checked.", deliverables: "A one-page report with your checking method.", hardware_needed: "" },
  { track: "robotics", title: "Line-following robot", brief: "Plan, simulate and then build a robot that follows a black line using two infrared sensors.", deliverables: "Flowchart, simulator program, build log.", hardware_needed: "Robot chassis, 2 IR sensors, motor driver, microcontroller board, battery pack (separate procurement approval required)." },
  { track: "robotics", title: "Smart classroom fan (IoT)", brief: "Extend the fan controller challenge to a real temperature/humidity sensor and a relay-controlled fan model.", deliverables: "Tested code, wiring diagram, safety checklist.", hardware_needed: "Microcontroller board, DHT-type sensor, relay module, low-voltage fan model (separate procurement approval required)." },
] as const;
