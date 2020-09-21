'use strict'

class HasMany {
  constructor (foreignKey, instance, model) {
    this.foreignKey = foreignKey
    this.instance = instance
    this.model = model
  }

  [Symbol.asyncIterator] () {
    return this.findIterator({})
  }

  find (query) {
    return asyncIterToArray(
      this.findIterator(query)
    )
  }

  findIterator (query) {
    return this.model.findIterator(
      bindToModel(this, query)
    )
  }

  findOne (query) {
    return this.model.findOne(
      bindToModel(this, query)
    )
  }

  findById (id) {
    return this.model.findOne(
      bindToModel(this, { id })
    )
  }

  count (query) {
    return this.model.count(
      bindToModel(this, query)
    )
  }
}

class HasManyMutable extends HasMany {
  build (data) {
    return this.model.build(
      bindToModel(this, data)
    )
  }

  add (item) {
    const { foreignKey, instance, model } = this
    if (!(item instanceof model)) {
      const error = new Error(`Invalid input to ${foreignKey}.add(...)`)
      return Promise.reject(error)
    }
    item[foreignKey] = instance.id
    return item.save()
  }

  findOrCreate (query, data) {
    return this.model.findOrCreate(
      bindToModel(this, query),
      data
    )
  }

  create (data) {
    return this.build(data).save()
  }

  createOrUpdate (query, data) {
    return this.model.createOrUpdate(
      bindToModel(this, query),
      data
    )
  }

  update (query, changes) {
    return asyncIterToArray(
      this.updateIterator(query, changes)
    )
  }

  updateIterator (query, changes) {
    return this.model.updateIterator(
      bindToModel(this, query),
      changes
    )
  }

  updateById (id, changes) {
    return this.model.updateOne(
      bindToModel(this, { id }),
      changes
    )
  }

  remove (query) {
    return asyncIterToArray(
      this.removeIterator(query)
    )
  }

  removeIterator (query) {
    return this.model.removeIterator(
      bindToModel(this, query)
    )
  }

  removeById (id) {
    return this.model.removeOne(
      bindToModel(this, { id })
    )
  }
}

async function asyncIterToArray (iter) {
  const items = []
  for await (const item of iter) {
    items.push(item)
  }
  return items
}

function bindToModel (model, query) {
  return Object.assign({}, query, modelQuery(model))
}

function modelQuery ({ foreignKey, instance }) {
  return { [foreignKey]: instance.id }
}

function addHasMany (BaseModel) {
  Object.defineProperty(BaseModel, 'hasMany', {
    value: function hasMany ({
      model,
      as = model.tableName,
      foreignKey = `${this.tableName}_id`,
      immutable = false
    }) {
      const Factory = immutable ? HasMany : HasManyMutable
      Object.defineProperty(this.prototype, as, {
        get () {
          return new Factory(foreignKey, this, model)
        }
      })
    }
  })

  return BaseModel
}

function middleware () {
  this.driver = addHasMany(this.driver)
}

middleware.addHasMany = addHasMany
middleware.HasMany = HasMany
middleware.HasManyMutable = HasManyMutable

module.exports = middleware
