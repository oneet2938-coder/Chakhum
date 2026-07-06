/**
 * Seeds Chemistry and Biology chapter topics so the app covers all three
 * NEET subjects (Physics + Chemistry + Biology). Questions for these
 * chapters are added later via the Admin AI Tools (manual add / AI
 * generate / AI extract) — this script only creates the chapter list.
 */
import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

type TopicSeed = { name: string; description: string; icon: string; classLevel: "11" | "12" };

const chemistry: TopicSeed[] = [
  { name: "Some Basic Concepts of Chemistry", description: "Mole concept, stoichiometry, laws of chemical combination.", icon: "flask", classLevel: "11" },
  { name: "Structure of Atom", description: "Atomic models, quantum numbers, electronic configuration.", icon: "atom", classLevel: "11" },
  { name: "Classification of Elements & Periodicity", description: "Periodic table trends and periodicity of properties.", icon: "layers", classLevel: "11" },
  { name: "Chemical Bonding & Molecular Structure", description: "Ionic, covalent bonding, VSEPR, hybridization.", icon: "git-merge", classLevel: "11" },
  { name: "States of Matter", description: "Gas laws, kinetic theory, liquid state properties.", icon: "wind", classLevel: "11" },
  { name: "Thermodynamics", description: "Enthalpy, entropy, Gibbs energy, thermochemistry.", icon: "flame", classLevel: "11" },
  { name: "Equilibrium", description: "Chemical and ionic equilibrium, Le Chatelier's principle.", icon: "refresh-cw", classLevel: "11" },
  { name: "Redox Reactions", description: "Oxidation-reduction, balancing redox equations.", icon: "zap", classLevel: "11" },
  { name: "Hydrogen", description: "Position, isotopes, hydrides, water and hydrogen peroxide.", icon: "droplet", classLevel: "11" },
  { name: "The s-Block Elements", description: "Alkali and alkaline earth metals and their compounds.", icon: "box", classLevel: "11" },
  { name: "The p-Block Elements (Groups 13 & 14)", description: "Boron and carbon family elements and compounds.", icon: "box", classLevel: "11" },
  { name: "Organic Chemistry — Basic Principles", description: "IUPAC nomenclature, isomerism, reaction mechanisms.", icon: "code", classLevel: "11" },
  { name: "Hydrocarbons", description: "Alkanes, alkenes, alkynes, aromatic hydrocarbons.", icon: "flame", classLevel: "11" },
  { name: "Solid State", description: "Crystal structures, unit cells, defects in solids.", icon: "box", classLevel: "12" },
  { name: "Solutions", description: "Concentration terms, colligative properties, Raoult's law.", icon: "droplet", classLevel: "12" },
  { name: "Electrochemistry", description: "Electrochemical cells, Nernst equation, conductance.", icon: "battery", classLevel: "12" },
  { name: "Chemical Kinetics", description: "Rate laws, order of reaction, Arrhenius equation.", icon: "trending-up", classLevel: "12" },
  { name: "Isolation of Elements", description: "Principles and processes of extraction of metals.", icon: "box", classLevel: "12" },
  { name: "The p-Block Elements (Groups 15–18)", description: "Nitrogen, oxygen, halogen and noble gas families.", icon: "wind", classLevel: "12" },
  { name: "The d & f Block Elements", description: "Transition and inner-transition elements, properties.", icon: "layers", classLevel: "12" },
  { name: "Coordination Compounds", description: "Ligands, nomenclature, bonding theories, isomerism.", icon: "git-merge", classLevel: "12" },
  { name: "Haloalkanes & Haloarenes", description: "Nomenclature, preparation, reactions of organic halides.", icon: "code", classLevel: "12" },
  { name: "Alcohols, Phenols & Ethers", description: "Preparation, properties and reactions of these functional groups.", icon: "droplet", classLevel: "12" },
  { name: "Aldehydes, Ketones & Carboxylic Acids", description: "Preparation, properties and reactions of carbonyl compounds.", icon: "flame", classLevel: "12" },
  { name: "Amines", description: "Classification, preparation, and reactions of amines.", icon: "code", classLevel: "12" },
  { name: "Biomolecules", description: "Carbohydrates, proteins, enzymes, nucleic acids, vitamins.", icon: "activity", classLevel: "12" },
  { name: "Polymers", description: "Classification, types of polymerization, important polymers.", icon: "layers", classLevel: "12" },
  { name: "Chemistry in Everyday Life", description: "Drugs, chemicals in food, cleansing agents.", icon: "target", classLevel: "12" },
];

const biology: TopicSeed[] = [
  { name: "The Living World", description: "Diversity, taxonomy, and classification of living organisms.", icon: "globe", classLevel: "11" },
  { name: "Biological Classification", description: "Five kingdom classification, viruses, viroids, lichens.", icon: "layers", classLevel: "11" },
  { name: "Plant Kingdom", description: "Algae, bryophytes, pteridophytes, gymnosperms, angiosperms.", icon: "globe", classLevel: "11" },
  { name: "Animal Kingdom", description: "Classification of animal phyla and their salient features.", icon: "globe", classLevel: "11" },
  { name: "Morphology of Flowering Plants", description: "Root, stem, leaf, inflorescence, flower, fruit and seed.", icon: "globe", classLevel: "11" },
  { name: "Anatomy of Flowering Plants", description: "Tissues and internal organization of plant organs.", icon: "layers", classLevel: "11" },
  { name: "Structural Organisation in Animals", description: "Animal tissues and organization in an insect (cockroach).", icon: "activity", classLevel: "11" },
  { name: "Cell: The Unit of Life", description: "Cell theory, prokaryotic & eukaryotic cell structure.", icon: "cpu", classLevel: "11" },
  { name: "Biomolecules", description: "Carbohydrates, proteins, lipids, nucleic acids, enzymes.", icon: "activity", classLevel: "11" },
  { name: "Cell Cycle & Cell Division", description: "Mitosis, meiosis, and significance of cell division.", icon: "refresh-cw", classLevel: "11" },
  { name: "Transport in Plants", description: "Diffusion, osmosis, ascent of sap, translocation.", icon: "arrow-right", classLevel: "11" },
  { name: "Mineral Nutrition", description: "Essential elements, mechanism of absorption, nitrogen fixation.", icon: "droplet", classLevel: "11" },
  { name: "Photosynthesis in Higher Plants", description: "Light and dark reactions, C3/C4 pathways, factors affecting it.", icon: "sun", classLevel: "11" },
  { name: "Respiration in Plants", description: "Glycolysis, Krebs cycle, electron transport, fermentation.", icon: "wind", classLevel: "11" },
  { name: "Plant Growth & Development", description: "Growth phases, plant hormones, photoperiodism, vernalisation.", icon: "trending-up", classLevel: "11" },
  { name: "Digestion & Absorption", description: "Human digestive system, digestion and absorption of nutrients.", icon: "activity", classLevel: "11" },
  { name: "Breathing & Exchange of Gases", description: "Human respiratory system, mechanism of breathing, gas exchange.", icon: "wind", classLevel: "11" },
  { name: "Body Fluids & Circulation", description: "Blood, lymph, human circulatory system, cardiac cycle.", icon: "droplet", classLevel: "11" },
  { name: "Excretory Products & their Elimination", description: "Human excretory system, urine formation, osmoregulation.", icon: "droplet", classLevel: "11" },
  { name: "Locomotion & Movement", description: "Types of movement, skeletal system, muscle contraction.", icon: "activity", classLevel: "11" },
  { name: "Neural Control & Coordination", description: "Human nervous system, neuron, reflex action, sense organs.", icon: "radio", classLevel: "11" },
  { name: "Chemical Coordination & Integration", description: "Endocrine glands and hormones of the human body.", icon: "zap", classLevel: "11" },
  { name: "Sexual Reproduction in Flowering Plants", description: "Flower structure, pollination, fertilization, seed formation.", icon: "globe", classLevel: "12" },
  { name: "Human Reproduction", description: "Male and female reproductive systems, gametogenesis, pregnancy.", icon: "activity", classLevel: "12" },
  { name: "Reproductive Health", description: "Reproductive health issues, contraception, STDs, infertility.", icon: "target", classLevel: "12" },
  { name: "Principles of Inheritance & Variation", description: "Mendelian genetics, linkage, sex determination, genetic disorders.", icon: "git-merge", classLevel: "12" },
  { name: "Molecular Basis of Inheritance", description: "DNA structure, replication, transcription, translation, gene regulation.", icon: "code", classLevel: "12" },
  { name: "Evolution", description: "Origin of life, evidence and mechanisms of evolution.", icon: "trending-up", classLevel: "12" },
  { name: "Human Health & Disease", description: "Common diseases, immunity, AIDS, cancer, drug abuse.", icon: "activity", classLevel: "12" },
  { name: "Microbes in Human Welfare", description: "Role of microbes in household, industry, and agriculture.", icon: "cpu", classLevel: "12" },
  { name: "Biotechnology: Principles & Processes", description: "Genetic engineering, recombinant DNA technology tools.", icon: "code", classLevel: "12" },
  { name: "Biotechnology & its Applications", description: "GM organisms, gene therapy, molecular diagnosis, biopiracy.", icon: "code", classLevel: "12" },
  { name: "Organisms & Populations", description: "Population attributes, interactions, and organism adaptations.", icon: "globe", classLevel: "12" },
  { name: "Ecosystem", description: "Structure, energy flow, nutrient cycling, ecological pyramids.", icon: "globe", classLevel: "12" },
  { name: "Biodiversity & Conservation", description: "Patterns of biodiversity, its loss, and conservation strategies.", icon: "globe", classLevel: "12" },
];

async function seedSubject(subject: "chemistry" | "biology", topics: TopicSeed[]) {
  const { rows: existing } = await pool.query(
    "SELECT name FROM topics WHERE subject = $1",
    [subject]
  );
  const existingNames = new Set(existing.map((r) => r.name));

  let inserted = 0;
  for (const t of topics) {
    if (existingNames.has(t.name)) continue;
    await pool.query(
      `INSERT INTO topics (name, description, icon, subject, class_level) VALUES ($1, $2, $3, $4, $5)`,
      [t.name, t.description, t.icon, subject, t.classLevel]
    );
    inserted++;
  }
  console.log(`${subject}: inserted ${inserted} new topics (${topics.length - inserted} already existed)`);
}

async function main() {
  await seedSubject("chemistry", chemistry);
  await seedSubject("biology", biology);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
