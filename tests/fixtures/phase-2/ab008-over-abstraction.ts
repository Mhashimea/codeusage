// Test fixture for AB008: Over-Abstraction Detection
// This file intentionally contains over-engineering patterns for testing

// Factory Factory - should be detected
class UserFactoryFactory {
  createFactory() {
    return new UserFactory();
  }
}

// Manager Manager - should be detected
class ServiceManagerManager {
  getManager() {
    return new ServiceManager();
  }
}

// Handler Handler - should be detected
class EventHandlerHandler {
  handle() {}
}

// Abstract Base Manager - should be detected
abstract class AbstractBaseManager {
  abstract manage(): void;
}

// Abstract Base Handler - should be detected
interface AbstractHandler {
  handle(): void;
}

// Generic Utils Class - should be detected
class GenericUtils {
  static doSomething() {}
}

// Helpers Class - should be detected
class Helpers {
  static help() {}
}

// Over-prefixed Interface - should be detected
interface IAbstractUserInterface {
  name: string;
}

// Empty Interface - should be detected
interface ExtendedUser extends BaseUser {}

// Singleton pattern - should be detected
class DatabaseConnection {
  private static instance: DatabaseConnection;

  static getInstance() {
    if (!this.instance) {
      this.instance = new DatabaseConnection();
    }
    return this.instance;
  }
}

// Enterprise naming - should be detected
class UserServiceImpl {
  getUsers() {
    return [];
  }
}

// Concrete implementation naming - should be detected
class ConcreteUserRepository {
  findAll() {
    return [];
  }
}

// Wrapper class - should be detected
class ApiClientWrapper {
  private client: any;

  call() {
    return this.client.call();
  }
}

// Simple Adapter - should be detected (small adapter)
class DataAdapter {
  adapt(data: any) {
    return data;
  }
}

// Deep inheritance - should be detected
class ConcreteUserBaseAbstractManager extends AbstractBaseManager {
  manage() {}
}

// Abstract chain - should be detected
abstract class AbstractServiceManager extends AbstractBaseManager {
  abstract serve(): void;
}

// Many generics - should be detected (4+ generic parameters)
type ComplexType<T, U, V, W, X> = {
  t: T;
  u: U;
  v: V;
  w: W;
  x: X;
};

// Nested generics - should be detected
type DeeplyNested<T> = Map<string, Map<number, Set<T>>>;

// Builder pattern - should be detected
class UserBuilder {
  private user: any = {};

  withName(name: string) {
    this.user.name = name;
    return this;
  }

  build() {
    return this.user;
  }
}

// Visitor pattern - should be detected
interface NodeVisitor {
  accept(visitor: any): void;
}

// Command pattern - should be detected
class CreateUserCommand implements UserCommand {
  execute() {}
}

// Specification pattern - should be detected
class ActiveUserSpecification extends UserSpecification {
  isSatisfiedBy(user: any) {
    return user.active;
  }
}

// Good patterns that should NOT be detected
class UserService {
  getUser(id: string) {
    return { id };
  }
}

function createUser(name: string) {
  return { name };
}

// Helper declarations
interface BaseUser {
  id: string;
}

class UserFactory {
  create() {
    return {};
  }
}

class ServiceManager {
  manage() {}
}

interface UserCommand {
  execute(): void;
}

class UserSpecification {
  isSatisfiedBy(user: any): boolean {
    return true;
  }
}

export {
  UserFactoryFactory,
  ServiceManagerManager,
  DatabaseConnection,
  UserServiceImpl,
};
