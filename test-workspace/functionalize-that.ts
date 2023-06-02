type Data = {
  id: string;
  name: string;
  age: number;
  email: string;
};

function notVeryFunctionalFunction(data: Data[]): Data[] {
  const newUserData: any[] = [];

  for (let i = 0; i < data.length; i++) {
    if (data[i].age < 18) {
      continue;
    }

    const newUserObject = {
      id: data[i].id,
      name: data[i].name,
      email: data[i].email,
    };

    newUserData.push(newUserObject);
  }

  return newUserData;
}