import { describe, expect, it } from 'vitest'
import {
  addressName,
  compareByLastName,
  fullName,
  listName,
  nameInitials,
  sortByLastName,
} from '@/entities/user/person-name/person-name'

const ivan = { first_name: 'Ivan', middle_name: 'Sergeevich', last_name: 'Petrov' }
const john = { first_name: 'John', middle_name: 'Fitzgerald', last_name: 'Smith' }

describe('person name composition', () => {
  it('puts the surname first in russian and the given name first in english', () => {
    expect(fullName(ivan, 'ru')).toBe('Petrov Ivan Sergeevich')
    expect(fullName(john, 'en')).toBe('John Fitzgerald Smith')
  })

  it('drops the middle name from list names', () => {
    expect(listName(ivan, 'ru')).toBe('Petrov Ivan')
    expect(listName(john, 'en')).toBe('John Smith')
  })

  it('addresses a person by given name, with the patronymic only in russian', () => {
    expect(addressName(ivan, 'ru')).toBe('Ivan Sergeevich')
    expect(addressName(john, 'en')).toBe('John')
  })

  it('skips an absent or blank middle name', () => {
    expect(fullName({ first_name: 'Ivan', last_name: 'Petrov' }, 'ru')).toBe('Petrov Ivan')
    expect(fullName({ first_name: 'John', middle_name: '', last_name: 'Smith' }, 'en')).toBe(
      'John Smith',
    )
    expect(fullName({ first_name: 'John', middle_name: null, last_name: 'Smith' }, 'en')).toBe(
      'John Smith',
    )
  })
})

describe('initials', () => {
  it('takes the first letter of the given name and of the surname', () => {
    expect(nameInitials(ivan)).toBe('IP')
    expect(nameInitials(john)).toBe('JS')
  })

  it('does not take the second word of a compound given name', () => {
    expect(nameInitials({ first_name: 'Anna Maria', last_name: 'Ivanova' })).toBe('AI')
  })

  it('survives a missing part', () => {
    expect(nameInitials({ first_name: '', last_name: 'Petrov' })).toBe('P')
  })
})

describe('sorting by surname', () => {
  it('orders surnames by the locale collation', () => {
    const people = [
      { first_name: 'Ivan', last_name: 'Yakovlev' },
      { first_name: 'Pyotr', last_name: 'Abramov' },
      { first_name: 'Anna', last_name: 'Ezhova' },
    ]
    expect(sortByLastName(people, 'ru').map((p) => p.last_name)).toEqual([
      'Abramov',
      'Ezhova',
      'Yakovlev',
    ])
  })

  it('falls back to the given name when surnames match', () => {
    const people = [
      { first_name: 'Pyotr', last_name: 'Ivanov' },
      { first_name: 'Anna', last_name: 'Ivanov' },
    ]
    expect(sortByLastName(people, 'ru').map((p) => p.first_name)).toEqual(['Anna', 'Pyotr'])
  })

  it('ignores case and diacritic-insensitive differences when comparing', () => {
    expect(
      compareByLastName(
        { first_name: 'a', last_name: 'smith' },
        { first_name: 'a', last_name: 'SMITH' },
        'en',
      ),
    ).toBe(0)
  })

  it('does not mutate the input array', () => {
    const people = [
      { first_name: 'Ivan', last_name: 'Yakovlev' },
      { first_name: 'Pyotr', last_name: 'Abramov' },
    ]
    sortByLastName(people, 'ru')
    expect(people[0]?.last_name).toBe('Yakovlev')
  })
})
