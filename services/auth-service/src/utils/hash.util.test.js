const { hashPassword, comparePassword } = require("./hash.util");

// 'describe' groups related tests together
describe("Password Hashing Utility", () => {
  // 'it' or 'test' defines an individual test case
  it("should correctly hash a given password", () => {
    const password = "password123";
    const hashedPassword = hashPassword(password);

    // We expect the hash to not be the same as the original password
    expect(hashedPassword).not.toBe(password);
    // We expect the hash to be a string
    expect(typeof hashedPassword).toBe("string");
  });

  it("should return true when comparing a correct password to its hash", () => {
    const password = "password123";
    const hashedPassword = hashPassword(password);

    const isMatch = comparePassword(password, hashedPassword);

    // We expect the comparison to be true
    expect(isMatch).toBe(true);
  });

  it("should return false when comparing a wrong password to a hash", () => {
    const password = "password123";
    const wrongPassword = "wrongpassword";
    const hashedPassword = hashPassword(password);

    const isMatch = comparePassword(wrongPassword, hashedPassword);

    // We expect the comparison to be false
    expect(isMatch).toBe(false);
  });
});
