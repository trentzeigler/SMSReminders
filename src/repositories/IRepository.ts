import { ObjectId } from 'mongodb';

export interface IRepository<T> {
    findById(id: ObjectId): Promise<T | null>;
    findOne(filter: Record<string, unknown>): Promise<T | null>;
    findMany(filter: Record<string, unknown>): Promise<T[]>;
    create(data: T): Promise<T>;
    update(id: ObjectId, data: Partial<T>): Promise<T | null>;
    delete(id: ObjectId): Promise<boolean>;
    count(filter: Record<string, unknown>): Promise<number>;
}
