'use strict'

const isSubset = require('is-subset')
const tap = require('tap')

const disco = require('@disco/disco')
const { BaseModel } = require('@disco/base-driver')
const hasMany = require('./')
const {
  HasMany,
  HasManyMutable
} = hasMany

function hasRelation (t, obj, meth, relation) {
  t.ok(
    obj.prototype[meth] instanceof relation,
    `"${meth}" getter is instance of ${relation.name}`
  )
}

function driver () {
  return class Model extends BaseModel {
    static reset (records = []) {
      this.hooks = []
      this.data = []

      for (const record of records) {
        this._add(record)
      }
    }

    static _add (data) {
      const { length } = this.data
      const record = { id: length + 1, ...data }
      this.data.push(record)
      return record
    }

    emit (event) {
      this.constructor.hooks.push(event)
    }

    _fetch () {
      return this.constructor.data.filter(v => v.id === this.id)[0]
    }

    _save () {
      return this.constructor._add(this)
    }

    _update () {
      const record = this.constructor.data
        .filter(model => model.id === this.id)

      Object.assign(record[0], this)
      return this._fetch()
    }

    _remove () {
      this.constructor.data = this.constructor.data
        .filter(model => model.id !== this.id)
    }

    static async * findIterator (query) {
      const items = this.data
        .filter(v => isSubset(v, query || {}))

      for (const item of items) {
        yield this.build(item)
      }
    }
  }
}

tap.test('HasMany', async t => {
  const modeller = disco(driver())
  modeller.use(hasMany)

  const Parent = modeller.createModel('parent')
  const Child = modeller.createModel('child')

  Parent.hasMany({
    model: Child,
    as: 'children',
    foreignKey: 'owner_id',
    immutable: true
  })
  hasRelation(t, Parent, 'children', HasMany)

  function recordsMatch (t, a, b) {
    t.equal(a.id, b.id, 'records match')
    t.equal(a.name, b.name, 'name is equal')
    t.equal(a.owner_id, b.owner_id)
  }

  t.test('is async-iterable', async t => {
    Parent.reset([
      { name: 'parent' }
    ])
    Child.reset([
      { name: 'async-iterable 1', owner_id: 1 },
      { name: 'async-iterable 2', owner_id: 1 }
    ])

    const parent = await Parent.findOne()

    let seen = 0
    for await (const child of parent.children) {
      recordsMatch(t, child, Child.data[seen++])
    }
    t.equal(seen, 2)
  })

  t.test('find', async t => {
    Parent.reset([
      { name: 'parent' }
    ])
    Child.reset([
      { name: 'find 1', owner_id: 1 },
      { name: 'find 2', owner_id: 1 }
    ])

    const parent = await Parent.findOne()
    const children = await parent.children.find()

    let seen = 0
    for (const child of children) {
      recordsMatch(t, child, Child.data[seen++])
    }
    t.equal(seen, 2)
  })

  t.test('findOne', async t => {
    Parent.reset([
      { name: 'parent' }
    ])
    Child.reset([
      { name: 'findOne', owner_id: 1 }
    ])

    const parent = await Parent.findOne()
    const child = await parent.children.findOne()
    recordsMatch(t, child, Child.data[0])
  })

  t.test('findById', async t => {
    Parent.reset([
      { name: 'parent' }
    ])
    Child.reset([
      { name: 'findById', owner_id: 1 }
    ])

    const parent = await Parent.findOne()
    const child = await parent.children.findById(1)
    recordsMatch(t, child, Child.data[0])
  })

  t.test('count', async t => {
    Parent.reset([
      { name: 'parent' }
    ])
    Child.reset([
      { name: 'count 1', owner_id: 1 },
      { name: 'count 2', owner_id: 2 }
    ])

    const parent = await Parent.findOne()
    t.equal(await parent.children.count(), 1)
  })

  t.end()
})

tap.test('HasManyMutable', async t => {
  const modeller = disco(driver())
  modeller.use(hasMany)

  const Parent = modeller.createModel('parent')
  const Child = modeller.createModel('child')

  Parent.hasMany({
    model: Child
  })
  hasRelation(t, Parent, 'child', HasManyMutable)

  function recordsMatch (t, a, b) {
    t.equal(a.id, b.id, 'records match')
    t.equal(a.name, b.name, 'name is equal')
    t.equal(a.parent_id, b.parent_id)
  }

  t.test('build', async t => {
    Parent.reset()
    Child.reset()

    const parent = await Parent.create({
      name: 'build'
    })
    const child = await parent.child.build({
      name: 'build'
    })

    t.equal(Child.data.length, 0, 'child has not been saved')
    recordsMatch(t, child, {
      name: 'build',
      parent_id: parent.id
    })
  })

  t.test('add', async t => {
    Parent.reset()
    Child.reset()

    const parent = await Parent.create({
      name: 'add'
    })
    const child = await Child.build({
      name: 'add'
    })

    t.notOk(child.id)
    await parent.child.add(child)
    recordsMatch(t, child, {
      id: 1,
      name: 'add',
      parent_id: parent.id
    })

    await t.rejects(parent.child.add({}), 'Invalid input to parent_id.add(...)')
  })

  t.test('findOrCreate', async t => {
    Parent.reset()
    Child.reset()

    const parent = await Parent.create({
      name: 'findOrCreate'
    })
    const data = {
      name: 'findOrCreate'
    }

    {
      const child = await parent.child.findOrCreate(data, data)
      recordsMatch(t, child, {
        id: 1,
        name: 'findOrCreate',
        parent_id: parent.id
      })
    }

    {
      const child = await parent.child.findOrCreate(data, data)
      recordsMatch(t, child, {
        id: 1,
        name: 'findOrCreate',
        parent_id: parent.id
      })
    }
  })

  t.test('create', async t => {
    Parent.reset()
    Child.reset()

    const parent = await Parent.create({
      name: 'create'
    })
    const child = await parent.child.create({
      name: 'build'
    })

    recordsMatch(t, child, {
      id: 1,
      name: 'build',
      parent_id: parent.id
    })
  })

  t.test('createOrUpdate', async t => {
    Parent.reset()
    Child.reset()

    const data = {
      name: 'createOrUpdate'
    }
    const parent = await Parent.create(data)

    {
      const child = await parent.child.createOrUpdate(data, {
        foo: 'bar'
      })
      recordsMatch(t, child, {
        id: 1,
        name: 'createOrUpdate',
        parent_id: parent.id,
        foo: 'bar'
      })
    }

    {
      const child = await parent.child.createOrUpdate(data, {
        baz: 'buz'
      })
      recordsMatch(t, child, {
        id: 1,
        name: 'createOrUpdate',
        parent_id: parent.id,
        baz: 'buz'
      })
    }
  })

  t.test('update', async t => {
    Parent.reset([
      { name: 'update' }
    ])
    Child.reset([
      { name: 'update', parent_id: 1 },
      { name: 'do not update', parent_id: 2 }
    ])

    const parent = await Parent.findOne()
    recordsMatch(t, Child.data[0], {
      id: 1,
      name: 'update',
      parent_id: 1
    })
    recordsMatch(t, Child.data[1], {
      id: 2,
      name: 'do not update',
      parent_id: 2
    })

    await parent.child.update({}, {
      name: 'updated'
    })
    recordsMatch(t, Child.data[0], {
      id: 1,
      name: 'updated',
      parent_id: 1
    })
    recordsMatch(t, Child.data[1], {
      id: 2,
      name: 'do not update',
      parent_id: 2
    })
  })

  t.test('updateById', async t => {
    Parent.reset([
      { name: 'update' }
    ])
    Child.reset([
      { name: 'update', parent_id: 1 },
      { name: 'do not update', parent_id: 1 }
    ])

    const parent = await Parent.findOne()
    recordsMatch(t, Child.data[0], {
      id: 1,
      name: 'update',
      parent_id: 1
    })
    recordsMatch(t, Child.data[1], {
      id: 2,
      name: 'do not update',
      parent_id: 1
    })

    const updated = await parent.child.updateById(1, {
      name: 'updated'
    })
    t.ok(updated)
    recordsMatch(t, Child.data[0], updated)
    recordsMatch(t, Child.data[0], {
      id: 1,
      name: 'updated',
      parent_id: 1
    })
    recordsMatch(t, Child.data[1], {
      id: 2,
      name: 'do not update',
      parent_id: 1
    })

    t.notOk(await parent.child.updateById(3, {
      name: 'not updated'
    }))
  })

  t.test('remove', async t => {
    Parent.reset([
      { name: 'remove' }
    ])
    Child.reset([
      { name: 'remove', parent_id: 1 },
      { name: 'do not remove', parent_id: 1 },
      { name: 'remove', parent_id: 2 }
    ])

    const parent = await Parent.findOne()
    t.equal(Child.data.length, 3)

    await parent.child.remove({
      name: 'remove'
    })
    t.equal(Child.data.length, 2)
    recordsMatch(t, Child.data[0], {
      id: 2,
      name: 'do not remove',
      parent_id: 1
    })
    recordsMatch(t, Child.data[1], {
      id: 3,
      name: 'remove',
      parent_id: 2
    })
  })

  t.test('removeById', async t => {
    Parent.reset([
      { name: 'remove' }
    ])
    Child.reset([
      { name: 'remove', parent_id: 1 },
      { name: 'do not remove', parent_id: 1 }
    ])

    const parent = await Parent.findOne()
    t.equal(Child.data.length, 2)

    const first = Object.assign({}, Child.data[0])
    delete first.id

    const removed = await parent.child.removeById(1)
    t.ok(removed)
    t.equal(Child.data.length, 1)
    recordsMatch(t, first, removed)
    recordsMatch(t, Child.data[0], {
      id: 2,
      name: 'do not remove',
      parent_id: 1
    })

    t.notOk(await parent.child.removeById(3, {
      name: 'not removed'
    }))
  })

  t.end()
})
