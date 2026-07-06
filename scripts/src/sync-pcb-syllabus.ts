/**
 * Reconciles Chemistry chapters against the official NEET UG 2026 syllabus
 * (NMC, published Dec 2025): removes chapters that are no longer part of the
 * rationalized syllabus, adds the one missing chapter, and seeds subtopics
 * for every Chemistry and Biology chapter (Physics already has subtopics).
 */
import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const CHEMISTRY_CHAPTERS_TO_REMOVE = [
  "States of Matter",
  "Hydrogen",
  "The s-Block Elements",
  "Solid State",
  "Isolation of Elements",
  "Polymers",
  "Chemistry in Everyday Life",
];

const NEW_CHEMISTRY_CHAPTER = {
  name: "Purification and Characterisation of Organic Compounds",
  description: "Crystallization, distillation, chromatography, qualitative & quantitative analysis of organic compounds.",
  icon: "flask",
  classLevel: "12" as const,
};

const chemistrySubtopics: Record<string, string[]> = {
  "Some Basic Concepts of Chemistry": [
    "Laws of Chemical Combination",
    "Atomic & Molecular Masses",
    "Mole Concept & Molar Mass",
    "Percentage Composition",
    "Empirical & Molecular Formulae",
    "Stoichiometry & Chemical Equations",
  ],
  "Structure of Atom": [
    "Electromagnetic Radiation & Photoelectric Effect",
    "Bohr Model of Hydrogen Atom",
    "Dual Nature of Matter & de Broglie Relation",
    "Heisenberg Uncertainty Principle",
    "Quantum Numbers & Atomic Orbitals",
    "Aufbau, Pauli & Hund's Rule",
  ],
  "Classification of Elements & Periodicity": [
    "Modern Periodic Law & Periodic Table",
    "s, p, d, f Block Elements",
    "Periodic Trends: Atomic & Ionic Radii",
    "Ionization Enthalpy & Electron Gain Enthalpy",
    "Valence, Oxidation States & Chemical Reactivity",
  ],
  "Chemical Bonding & Molecular Structure": [
    "Ionic Bonding & Lattice Enthalpy",
    "Covalent Bonding & Electronegativity",
    "VSEPR Theory & Molecular Shapes",
    "Valence Bond Theory & Hybridization",
    "Resonance",
    "Molecular Orbital Theory",
    "Hydrogen Bonding & Metallic Bonding",
  ],
  "Thermodynamics": [
    "System, Surroundings & State Functions",
    "First Law of Thermodynamics",
    "Enthalpy & Hess's Law",
    "Enthalpies of Bond, Formation & Combustion",
    "Second Law: Spontaneity, Entropy & Gibbs Energy",
  ],
  "Equilibrium": [
    "Equilibrium in Physical Processes",
    "Law of Chemical Equilibrium (Kp, Kc)",
    "Le Chatelier's Principle",
    "Acids, Bases & Ionization Constants",
    "pH Scale & Common Ion Effect",
    "Hydrolysis of Salts & Buffer Solutions",
    "Solubility Product",
  ],
  "Redox Reactions": [
    "Oxidation & Reduction Concepts",
    "Oxidation Number Rules",
    "Balancing Redox Reactions",
  ],
  "The p-Block Elements (Groups 13 & 14)": [
    "Group 13: Boron Family",
    "Group 14: Carbon Family",
    "Periodic Trends Across Groups 13 & 14",
  ],
  "Organic Chemistry — Basic Principles": [
    "Tetravalency of Carbon & Hybridization",
    "Classification & Nomenclature (IUPAC)",
    "Isomerism: Structural & Stereo",
    "Homolytic & Heterolytic Fission",
    "Electronic Effects: Inductive, Resonance & Hyperconjugation",
    "Types of Organic Reactions",
  ],
  "Hydrocarbons": [
    "Alkanes: Conformations & Halogenation",
    "Alkenes: Geometrical Isomerism & Electrophilic Addition",
    "Alkynes: Acidic Character & Addition Reactions",
    "Aromatic Hydrocarbons: Structure of Benzene",
    "Electrophilic Substitution & Friedel-Crafts Reactions",
  ],
  "Solutions": [
    "Concentration Terms",
    "Raoult's Law & Vapour Pressure",
    "Colligative Properties",
    "Abnormal Molar Mass & van't Hoff Factor",
  ],
  "Electrochemistry": [
    "Electrolytic & Metallic Conduction",
    "Kohlrausch's Law",
    "Electrochemical Cells & Electrode Potential",
    "Nernst Equation",
    "Dry Cell, Lead Accumulator & Fuel Cells",
  ],
  "Chemical Kinetics": [
    "Rate of Reaction & Factors Affecting It",
    "Order & Molecularity",
    "Integrated Rate Laws (Zero & First Order)",
    "Arrhenius Equation & Activation Energy",
    "Collision Theory",
  ],
  "The p-Block Elements (Groups 15–18)": [
    "Group 15: Nitrogen Family",
    "Group 16: Oxygen Family",
    "Group 17: Halogen Family",
    "Group 18: Noble Gases",
  ],
  "The d & f Block Elements": [
    "Transition Elements: Electronic Configuration & Trends",
    "Oxidation States, Colour & Magnetic Properties",
    "KMnO4 & K2Cr2O7 Preparation & Properties",
    "Lanthanoids & Lanthanoid Contraction",
    "Actinoids",
  ],
  "Coordination Compounds": [
    "Werner's Theory & Ligands",
    "IUPAC Nomenclature",
    "Isomerism in Coordination Compounds",
    "Valence Bond Theory & Crystal Field Theory",
    "Importance & Applications",
  ],
  "Purification and Characterisation of Organic Compounds": [
    "Crystallization, Sublimation & Distillation",
    "Chromatography",
    "Qualitative Analysis of Elements",
    "Quantitative Analysis & Empirical Formula",
  ],
  "Haloalkanes & Haloarenes": [
    "Nature of C-X Bond",
    "Preparation & Properties",
    "Mechanisms of Substitution",
    "Uses & Environmental Effects",
  ],
  "Alcohols, Phenols & Ethers": [
    "Alcohols: Preparation & Dehydration",
    "Phenols: Acidic Nature & Electrophilic Substitution",
    "Ethers: Structure & Properties",
  ],
  "Aldehydes, Ketones & Carboxylic Acids": [
    "Nucleophilic Addition Reactions",
    "Aldol Condensation & Cannizzaro Reaction",
    "Haloform Reaction",
    "Carboxylic Acids: Acidic Strength",
  ],
  "Amines": [
    "Classification & Nomenclature",
    "Basic Character of Amines",
    "Preparation & Reactions",
    "Diazonium Salts",
  ],
  "Biomolecules": [
    "Carbohydrates: Classification & Structure",
    "Proteins: Amino Acids & Protein Structure",
    "Enzymes",
    "Vitamins",
    "Nucleic Acids: DNA & RNA",
    "Hormones",
  ],
};

const biologySubtopics: Record<string, string[]> = {
  "The Living World": ["What is Living?", "Biodiversity & Need for Classification", "Taxonomy & Systematics", "Taxonomic Hierarchy & Binomial Nomenclature"],
  "Biological Classification": ["Five Kingdom Classification", "Monera, Protista & Fungi", "Lichens", "Viruses & Viroids"],
  "Plant Kingdom": ["Algae", "Bryophytes", "Pteridophytes", "Gymnosperms"],
  "Animal Kingdom": ["Classification Basis", "Non-Chordate Phyla", "Chordate Classes"],
  "Morphology of Flowering Plants": ["Root & Stem", "Leaf & Inflorescence", "Flower Structure", "Fruit & Seed", "Important Plant Families"],
  "Anatomy of Flowering Plants": ["Plant Tissues", "Anatomy of Root, Stem & Leaf", "Secondary Growth"],
  "Structural Organisation in Animals": ["Animal Tissues", "Organ Systems in an Insect (Frog)"],
  "Cell: The Unit of Life": ["Cell Theory & Cell Types", "Cell Envelope, Membrane & Wall", "Cell Organelles", "Cytoskeleton, Cilia & Flagella", "Nucleus"],
  "Biomolecules": ["Chemical Constituents of Cells", "Proteins, Carbohydrates & Lipids", "Nucleic Acids", "Enzymes: Types & Action"],
  "Cell Cycle & Cell Division": ["Cell Cycle Phases", "Mitosis", "Meiosis", "Significance of Cell Division"],
  "Transport in Plants": ["Diffusion & Osmosis", "Plant-Water Relations", "Long Distance Transport", "Uptake & Translocation"],
  "Mineral Nutrition": ["Essential Elements", "Mechanism of Absorption", "Nitrogen Fixation"],
  "Photosynthesis in Higher Plants": ["Photosynthetic Pigments", "Light Reactions", "Calvin Cycle & C4 Pathway", "Photorespiration", "Factors Affecting Photosynthesis"],
  "Respiration in Plants": ["Glycolysis", "Fermentation", "TCA Cycle & Electron Transport", "Respiratory Quotient"],
  "Plant Growth & Development": ["Seed Germination & Growth Phases", "Differentiation & Development", "Plant Growth Regulators", "Photoperiodism & Vernalisation"],
  "Digestion & Absorption": ["Digestive System", "Digestion of Food", "Absorption of Digested Products", "Disorders of Digestive System"],
  "Breathing & Exchange of Gases": ["Respiratory Organs & System", "Mechanism of Breathing", "Exchange & Transport of Gases", "Respiratory Disorders"],
  "Body Fluids & Circulation": ["Blood Composition & Groups", "Lymph", "Human Heart & Blood Vessels", "Cardiac Cycle & ECG", "Circulatory Disorders"],
  "Excretory Products & their Elimination": ["Modes of Excretion", "Human Excretory System", "Urine Formation & Osmoregulation", "Regulation of Kidney Function", "Disorders"],
  "Locomotion & Movement": ["Types of Movement", "Skeletal Muscle & Contraction", "Skeletal System", "Joints & Disorders"],
  "Neural Control & Coordination": ["Neuron Structure", "Nervous System Organization", "Generation & Conduction of Nerve Impulse", "Reflex Action & Sense Organs"],
  "Chemical Coordination & Integration": ["Endocrine Glands & Hormones", "Hypothalamus & Pituitary", "Thyroid, Parathyroid & Adrenal", "Pancreas & Gonads", "Hormonal Disorders"],
  "Sexual Reproduction in Flowering Plants": ["Flower Structure & Gametophyte Development", "Pollination", "Pollen-Pistil Interaction & Fertilization", "Seed & Fruit Formation"],
  "Human Reproduction": ["Male & Female Reproductive Systems", "Gametogenesis", "Menstrual Cycle", "Fertilisation & Implantation", "Pregnancy & Parturition"],
  "Reproductive Health": ["Reproductive Health & STDs", "Birth Control Methods", "Medical Termination of Pregnancy", "Infertility & ART"],
  "Principles of Inheritance & Variation": ["Mendelian Inheritance", "Deviations from Mendelism", "Chromosomal Theory of Inheritance", "Sex Determination & Linkage", "Genetic Disorders"],
  "Molecular Basis of Inheritance": ["DNA & RNA Structure", "DNA Replication & Packaging", "Transcription & Genetic Code", "Translation", "Gene Regulation & Human Genome Project"],
  "Evolution": ["Origin of Life", "Evidence for Evolution", "Darwinism & Modern Synthesis", "Mechanism: Mutation, Selection & Genetic Drift", "Human Evolution"],
  "Human Health & Disease": ["Pathogens & Common Diseases", "Immunity & Vaccines", "Cancer & AIDS", "Drug & Alcohol Abuse"],
  "Microbes in Human Welfare": ["Microbes in Household & Industry", "Sewage Treatment", "Biogas & Energy Generation", "Biocontrol & Biofertilizers"],
  "Biotechnology: Principles & Processes": ["Genetic Engineering Principles", "Recombinant DNA Technology", "Tools of Biotechnology"],
  "Biotechnology & its Applications": ["Biotechnology in Health", "Biotechnology in Agriculture", "Transgenic Animals", "Biosafety & Biopiracy"],
  "Organisms & Populations": ["Organisms & Environment", "Population Interactions", "Population Attributes & Growth"],
  "Ecosystem": ["Ecosystem Structure & Components", "Productivity & Decomposition", "Energy Flow", "Ecological Pyramids"],
  "Biodiversity & Conservation": ["Concept & Patterns of Biodiversity", "Importance & Loss of Biodiversity", "Biodiversity Conservation Strategies", "Hotspots & Protected Areas"],
};

async function removeObsoleteChemistryChapters() {
  const { rows } = await pool.query(
    "SELECT id, name FROM topics WHERE subject = 'chemistry' AND name = ANY($1)",
    [CHEMISTRY_CHAPTERS_TO_REMOVE]
  );
  for (const row of rows) {
    await pool.query("DELETE FROM topics WHERE id = $1", [row.id]);
    console.log(`Removed obsolete chapter: ${row.name}`);
  }
  if (rows.length === 0) console.log("No obsolete chemistry chapters found (already removed).");
}

async function addMissingChemistryChapter() {
  const { rows } = await pool.query(
    "SELECT id FROM topics WHERE subject = 'chemistry' AND name = $1",
    [NEW_CHEMISTRY_CHAPTER.name]
  );
  if (rows.length > 0) {
    console.log(`Chapter already exists: ${NEW_CHEMISTRY_CHAPTER.name}`);
    return;
  }
  await pool.query(
    `INSERT INTO topics (name, description, icon, subject, class_level) VALUES ($1, $2, $3, 'chemistry', $4)`,
    [NEW_CHEMISTRY_CHAPTER.name, NEW_CHEMISTRY_CHAPTER.description, NEW_CHEMISTRY_CHAPTER.icon, NEW_CHEMISTRY_CHAPTER.classLevel]
  );
  console.log(`Added new chapter: ${NEW_CHEMISTRY_CHAPTER.name}`);
}

async function seedSubtopics(subject: "chemistry" | "biology", map: Record<string, string[]>) {
  const { rows: topics } = await pool.query(
    "SELECT id, name FROM topics WHERE subject = $1",
    [subject]
  );
  let totalInserted = 0;
  for (const topic of topics) {
    const subtopicNames = map[topic.name];
    if (!subtopicNames) {
      console.log(`  (no subtopic list defined for "${topic.name}", skipping)`);
      continue;
    }
    const { rows: existing } = await pool.query(
      "SELECT name FROM subtopics WHERE topic_id = $1",
      [topic.id]
    );
    const existingNames = new Set(existing.map((r) => r.name));
    let orderIndex = existing.length;
    let inserted = 0;
    for (const name of subtopicNames) {
      if (existingNames.has(name)) continue;
      await pool.query(
        "INSERT INTO subtopics (topic_id, name, order_index) VALUES ($1, $2, $3)",
        [topic.id, name, orderIndex]
      );
      orderIndex++;
      inserted++;
    }
    totalInserted += inserted;
  }
  console.log(`${subject}: inserted ${totalInserted} new subtopics across ${topics.length} chapters`);
}

async function main() {
  await removeObsoleteChemistryChapters();
  await addMissingChemistryChapter();
  await seedSubtopics("chemistry", chemistrySubtopics);
  await seedSubtopics("biology", biologySubtopics);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
