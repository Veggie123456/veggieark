const ANIMALS = [
  // Common (weight 50)
  { name: "Mouse", emoji: "🐭", rarity: "common", weight: 23 },
  { name: "Cat", emoji: "🐱", rarity: "common", weight: 23 },
  { name: "Dog", emoji: "🐶", rarity: "common", weight: 23 },
  { name: "Rabbit", emoji: "🐰", rarity: "common", weight: 23 },
  { name: "Chicken", emoji: "🐔", rarity: "common", weight: 23 },
  { name: "Duck", emoji: "🦆", rarity: "common", weight: 23 },
  { name: "Pig", emoji: "🐷", rarity: "common", weight: 23 },
  { name: "Cow", emoji: "🐮", rarity: "common", weight: 23 },
  { name: "Horse", emoji: "🐴", rarity: "common", weight: 23 },
  { name: "Goat", emoji: "🐐", rarity: "common", weight: 23 },
  { name: "Sheep", emoji: "🐑", rarity: "common", weight: 23 },
  { name: "Donkey", emoji: "🫏", rarity: "common", weight: 23 },
  { name: "Turkey", emoji: "🦃", rarity: "common", weight: 23 },
  { name: "Rooster", emoji: "🐓", rarity: "common", weight: 23 },
  { name: "Hamster", emoji: "🐹", rarity: "common", weight: 23 },
  { name: "Hedgehog", emoji: "🦔", rarity: "common", weight: 23 },
  { name: "Frog", emoji: "🐸", rarity: "common", weight: 23 },

  // Uncommon (weight 20)
  { name: "Fox", emoji: "🦊", rarity: "uncommon", weight: 20 },
  { name: "Raccoon", emoji: "🦝", rarity: "uncommon", weight: 20 },
  { name: "Owl", emoji: "🦉", rarity: "uncommon", weight: 20 },
  { name: "Parrot", emoji: "🦜", rarity: "uncommon", weight: 20 },
  { name: "Deer", emoji: "🦌", rarity: "uncommon", weight: 20 },
  { name: "Swan", emoji: "🦢", rarity: "uncommon", weight: 20 },
  { name: "Crocodile", emoji: "🐊", rarity: "uncommon", weight: 20 },

  // Rare (weight 7)
  { name: "Zebra", emoji: "🦓", rarity: "rare", weight: 7 },
  { name: "Leopard", emoji: "🐆", rarity: "rare", weight: 7 },
  { name: "Elephant", emoji: "🐘", rarity: "rare", weight: 7 },
  { name: "Gorilla", emoji: "🦍", rarity: "rare", weight: 7 },
  { name: "Camel", emoji: "🐫", rarity: "rare", weight: 7 },
  { name: "Giraffe", emoji: "🦒", rarity: "rare", weight: 7 },
  { name: "Koala", emoji: "🐨", rarity: "rare", weight: 7 },

  // Epic (weight 2)
  { name: "Tiger", emoji: "🐅", rarity: "epic", weight: 2 },
  { name: "Rhino", emoji: "🦏", rarity: "epic", weight: 2 },
  { name: "Eagle", emoji: "🦅", rarity: "epic", weight: 2 },
  { name: "Wolf", emoji: "🐺", rarity: "epic", weight: 2 },

  // Legendary/Mythic (weight 1)
  { name: "Unicorn", emoji: "🦄", rarity: "legendary", weight: 1 },
  { name: "Dragon", emoji: "🐉", rarity: "legendary", weight: 1 },
  { name: "Fairy", emoji: "🧚", rarity: "legendary", weight: 1 }
];

function pickRandomAnimal() {
  const totalWeight = ANIMALS.reduce((sum, animal) => sum + animal.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const animal of ANIMALS) {
    if (roll < animal.weight) {
      return animal;
    }
    roll -= animal.weight;
  }
  return ANIMALS[ANIMALS.length - 1];
}

module.exports = {
  ANIMALS,
  pickRandomAnimal,
};


