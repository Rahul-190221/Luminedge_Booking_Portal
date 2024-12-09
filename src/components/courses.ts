export interface Course {
  _id: string;
  name: string;
  image: string;
  link: string;
}

export const coursesList: Course[] = [
  {
    _id: "67337c880794d577cd982b75",
    name: "IELTS",
    image: "https://i.ibb.co/MPBCMfb/ielts.webp",
    link: "https://luminedge.com.bd/ielts/",
  },
  {
    _id: "67337c880794d577cd982b76",
    name: "Pearson PTE",
    image: "https://i.ibb.co/4mrhCkN/pte.webp",
    link: "https://luminedge.com.bd/pte/",
  },
  {
    _id: "67337c880794d577cd982b77",
    name: "GRE",
    image: "https://i.ibb.co/SX7t52h/gre.webp",
    link: "https://luminedge.com.bd/gre/",
  },
  {
    _id: "67337c880794d577cd982b78",
    name: "TOEFL",
    image: "https://i.ibb.co/vjyL3QC/toefl.webp",
    link: "https://luminedge.com.bd/best-toefl-coaching-in-dhaka/",
  },
];
