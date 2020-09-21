# @disco/has-many

[![CI status](https://github.com/discorm/has-many/workflows/ci/badge.svg)](https://github.com/discorm/has-many/actions?query=workflow%3Aci+branch%3Amaster)
[![Coverage Status](https://coveralls.io/repos/discorm/has-many/badge.png)](https://coveralls.io/r/discorm/has-many)
[![npm package](https://img.shields.io/npm/v/@disco/has-many)](https://npmjs.com/package/@disco/has-many)
[![Dependencies](https://img.shields.io/david/discorm/has-many)](https://david-dm.org/discorm/has-many)
[![MIT License](https://img.shields.io/npm/l/@disco/has-many)](./LICENSE)

This is a middleware for disco to add has-many relation support.

## Install

```sh
npm install @disco/has-many
```

## Usage

```js
const disco = require('@disco/disco')
const hasMany = require('@disco/has-many')

const modeller = disco(driver)
modeller.use(hasMany)

const User = modeller.createModel('user')
const Post = modeller.createModel('post')

User.hasMany({
  model: Post,
  as: 'posts'
})

const user = await User.findOne({})
for await (const post of user.posts) {
  console.log(post)
}
```

## HasMany API

### Model.hasMany(config : Object)
This is the entrypoint to create a hasMany relation on a given model.

* `config` {Object} config object
  * `model` {Model} Model this has many of
  * `as` {String} Name of relation property (default: model.tableName)
  * `foreignKey` {String} Column name of foreign key (default: Model.tableName)
  * `immutable` {Boolean} If it should exclude mutation APIs (default: false)

```js
User.hasMany({
  model: Post,
  as: 'posts'
})

const user = User.findOne({})
user.posts // User.hasMany(...) added this relation property
```

Note that while a relation _can_ be set to `immutable`, this currently only makes the _relation_ immutable and not any of the models returned by it.

### Non-mutating

These APIs will always be included regardless of if `immutable` has been set to `false`.

#### relation\[Symbol.asyncIterator]() : AsyncIterator\<Model>
Relations are async iterable so they can be used in for-await loops.

```js
for await (const post of user.posts) {
  // ...
}
```

#### relation.find(query : Object) : Promise<Array\<Model>>

Find many related records by the given query.

```js
const posts = await user.posts.find({
  title: 'test post'
})
```

#### relation.findIterator(query : Object) : AsyncIterator\<Model>

Find many related records by the given query.

```js
const posts = user.posts.findIterator({
  title: 'test post'
})

for await (const post of posts) {
  // ..
}
```

#### relation.findOne(query : Object) : Promise\<Model>

Find a related record by the given query.

```js
const post = await user.posts.findOne({
  title: 'test post'
})
```

#### relation.findById(id : ID) : Promise\<Model>

Find a related record by the given id.

```js
const post = await user.posts.findById(1)
```

#### relation.count(query : Object) : Promise\<Number>

Count related records matching the given query.

```js
const count = await user.posts.count({
  title: 'test post'
})
```

### Mutating

If `immutable` has been set to `false` in `Model.hasMany(...)`, these APIs will not be included.

#### relation.build(data : Object) : Model

Build a new related record. This will not persist until the returned model is saved.

```js
const post = user.posts.build({
  title: 'test post'
})
await post.save()
```

#### relation.create(data : Object) : Promise\<Model>

Create a new related record. This will persist before returning the model.

```js
const post = await user.posts.create({
  title: 'test post'
})
```

#### relation.add(model : Model) : Promise\<Model>

Add an existing model to this relation.

```js
const post = Post.build({
  title: 'test post'
})

await user.posts.add(post)
```

#### relation.findOrCreate(query : Object, data : Object) : Promise\<Model>

Attempt to find a related record by the given `query`, creating it with the given `data` if not found.

```js
const post = await user.posts.findOrCreate({
  title: 'test post'
}, {
  title: 'better title'
})
```

#### relation.createOrUpdate(query : Object, changes : Object) : Promise\<Model>

Attempt to update a related record found by the given `query` by applying the given `changes`, creating it with the `changes` if not found.

```js
const post = await user.posts.createOrUpdate({
  title: 'test post'
}, {
  title: 'better title'
})
```

#### relation.update(query : Object, changes : Object) : Promise<Array\<Model>>

Update any related records found by the given `query` by applying the given `changes`.

```js
const posts = await user.posts.update({
  title: 'test post'
}, {
  title: 'better title'
})
```

#### relation.updateIterator(query : Object, changes : Object) : AsyncIterator\<Model>

Update any related records found by the given `query` by applying the given `changes`.

```js
const posts = user.posts.update({
  title: 'test post'
}, {
  title: 'better title'
})

for await (const post of posts) {
  // ...
}
```

#### relation.updateById(id : ID, changes : Object) : Promise\<Model>

Update a related record by `id` by applying the given `changes`.

```js
const post = await user.posts.updateById(1, {
  title: 'better title'
})
```

#### relation.remove(query : Object) : Promise<Array\<Model>>

Remove related records by the given `query`.

```js
const removedPosts = await user.posts.remove({
  title: 'better title'
})
```

#### relation.removeIterator(query : Object) : AsyncIterator\<Model>

Remove related records by the given `query`.

```js
const removedPosts = user.posts.remove({
  title: 'better title'
})

for await (const post of removedPosts) {
  // ..
}
```

#### relation.removeById(id : ID) : Promise\<Model>

Remove a related record by `id`.

```js
const removedPost = await user.posts.removeById(1)
```
