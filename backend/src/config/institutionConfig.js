// Centralized institution configuration for ID card verification.
// Extend this (or turn it into a lookup keyed by email domain) to support
// additional institutions later — nothing in the verification pipeline
// should hardcode institution details outside of this file.

module.exports = {
  name: 'Kongu Engineering College',
  aliases: [
    'kongu engineering college',
    'kongu engineering',
    'kongu engg college',
    'kongu engg',
    'kongu',
    'kec',
    'kongu.edu'
  ],
  emailDomain: 'kongu.edu',

  // Loose sanity pattern only — used for confidence signals, never a hard reject.
  rollNumberPattern: /^[0-9]{2,3}[A-Za-z]{2,5}[0-9]{2,4}$/,

  // Maps common department abbreviations/short forms (as they might appear on
  // a printed ID card) to a normalized long form, so "CSE" on a card matches
  // "Computer Science and Engineering" entered at signup.
  departmentAbbreviations: {
    cse: 'computer science and engineering',
    csd: 'computer science and design',
    it: 'information technology',
    ece: 'electronics and communication engineering',
    eee: 'electrical and electronics engineering',
    eie: 'electronics and instrumentation engineering',
    mech: 'mechanical engineering',
    me: 'mechanical engineering',
    civil: 'civil engineering',
    ce: 'civil engineering',
    auto: 'automobile engineering',
    mct: 'mechatronics engineering',
    chem: 'chemical engineering',
    'food tech': 'food technology',
    ft: 'food technology',
    aiml: 'artificial intelligence and machine learning',
    aids: 'artificial intelligence and data science',
    mba: 'master of business administration',
    mca: 'master of computer applications',
    arch: 'architecture',
    vlsi: 'vlsi design',
    'structural engineering': 'structural engineering',
    'software systems': 'software systems',
    'information systems': 'information systems',
    'computer systems and design': 'computer systems and design'
  }
};
