function processUserData(data: any[]) {
  const result: any = [];

  for (let i = 0; i < data.length; i++) {
    const user = {
      name: "",
      age: 0,
      email: "",
      address: {
        street: "",
        city: "",
        state: "",
        zip: ""
      }
    };

    user.name = data[i].name;
    user.age = data[i].age;
    user.email = data[i].email;
    user.address.street = data[i].address.street;
    user.address.city = data[i].address.city;
    user.address.state = data[i].address.state;
    user.address.zip = data[i].address.zip;

    if (user.age > 18) {
      result.push(user);
    }
  }

  return result;
}

