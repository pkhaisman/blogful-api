const express = require('express')
const xss = require('xss')
const path = require('path')
const ArticlesService = require('./articles-service')

const articlesRouter = express.Router()
const jsonParser = express.json()

const serializeArticle = article => ({
    id: article.id,
    style: article.style,
    title: xss(article.title),
    content: xss(article.content),
    date_published: article.date_published,
    author: article.author,
})

articlesRouter
    .route('/')
    .get((req, res, next) => {
        ArticlesService.getAllArticles(
            req.app.get('db')
        )

        .then(articles => {
            res.json(articles.map(serializeArticle))
          })
            .then(sanitizedArticles => res.json(sanitizedArticles))
            .catch(next)
    })
    .post(jsonParser, (req, res, next) => {
        const { title, content, style, author } = req.body
        const newArticle = { title, content, style }

        if (!title) {
            return res.status(400).json({
                error: { message: `Missing 'title' in request body` }
            });
        }

        if (!content) {
            return res.status(400).json({
                error: { message: `Missing 'content' in request body`}
            });
        }

        newArticle.author = author

        ArticlesService.insertArticle(
            req.app.get('db'),
            newArticle
        )
            .then(article => {
                res
                    .status(201)
                    .location(path.posix.join(req.originalUrl + `/${article.id}`))
                    .json(serializeArticle(article))
            })
            .catch(next)
    })

articlesRouter
    .route('/:article_id')
    .all((req, res, next) => {
        ArticlesService.getById(
            req.app.get('db'),
            req.params.article_id
        )
            .then(article => {
                if (!article) {
                    return res.status(404).json({
                        error: { message: `Article doesn't exist` }
                    })
                }
                // what does this do?
                res.article = article
                next()
            })
    })
    .get((req, res, next) => {
        const knexInstance = req.app.get('db')
        ArticlesService.getById(knexInstance, req.params.article_id)
            .then(article => {
                if (!article) {
                    return res.status(404).json({
                        error: { message: `Article doesn't exist` }
                    })
                }
                res.json(serializeArticle(article))
            })
            .catch(next)
    })
    .delete((req, res, next) => {
        const knexInstance = req.app.get('db')

        ArticlesService.deleteArticle(
            knexInstance,
            req.params.article_id
        )
            .then(() => {
                res.status(204).end()
            })
            .catch(next);
    })
    .patch(jsonParser, (req, res, next) => {
        const { title, content, style } = req.body;
        const articleToUpdate = { title, content, style }

        const numberOfValues = Object.values(articleToUpdate).filter(Boolean).length;
        if (numberOfValues === 0) {
            return res.status(400).json({
                error: {
                    message: `Request body must contain 'title', 'style', or 'content'`
                }
            })
        }

        ArticlesService.updateArticle(
            req.app.get('db'),
            req.params.article_id,
            articleToUpdate
        )
            .then(numRowsAffected => {
                res.status(204).end()
            })
            .catch(next)
    })

module.exports = articlesRouter