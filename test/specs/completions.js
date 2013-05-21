var expect = require('chai').expect,
    utils = require('../utils'),
    async = require('async'),
    path = require('path'),
    fs = require('fs')

describe('/completions', function () {
  var project_dir = path.join(__dirname, '..', 'workspaces', '#0')
  
  it('no FILE', function (callback) {
    utils.query('/completions', {
      project_id: '0',
      project_dir: path.join(__dirname, '..', 'workspaces', '#0'),
      path: path.join(__dirname, '..', 'workspaces', '#0', 'node.js'),
      cursor_position: 60
    }, function (e, result) {
      if(e) return callback(e)
      expect(result).to.contain.keys('completions')
      expect(result.completions.length).to.be.at.least(1)
      expect(result.completions[0]).to.contain.keys('name', 'type')
      expect(result.completions[0].name).to.eql('t')
      callback()
    })
  })
  
  describe('not untitled', function () {
    before(function (callback) {
      utils.query('/file/opened', {
        project_dir: project_dir,
        project_id: 0,
        document_id: 0,
        FILE: fs.readFileSync(path.join(project_dir, 'node.js'))
      }, callback)
    })
    
    after(function (callback) {
      utils.query('/file/closed', {
        project_dir: project_dir,
        project_id: 0,
        document_id: 0
      }, callback)
    })
  
    it('without offset', function (callback) {
      utils.query('/completions', {
        project_id: 0,
        document_id: 0,
        project_dir: project_dir,
        path: path.join(__dirname, '..', 'workspaces', '#0', 'node.js'),
        FILE: fs.readFileSync(path.join(project_dir, 'node.js'), 'utf8'),
        sending_full_content: true,
        cursor_position: 60
      }, function (e, result) {
        if(e) return callback(e)
        expect(result).to.contain.keys('completions')
        expect(result.completions.length).to.be.at.least(1)
        expect(result.completions[0]).to.contain.keys('name', 'type')
        expect(result.completions[0].name).to.eql('t')
        callback()
      })
    })
  
    it('with offset', function (callback) {
      utils.query('/completions', {
        project_id: 0,
        document_id: 0,
        project_dir: project_dir,
        path: path.join(__dirname, '..', 'workspaces', '#0', 'node.js'),
        FILE: 'fs.',
        delta_offset: 56,
        delta_length: 4, //SHOULDN'T THIS BE 3???
        cursor_position: 59
      }, function (e, result) {
        if(e) return callback(e)
        expect(result).to.contain.keys('completions')
        expect(result.completions.length).to.be.at.least(1)
        expect(result.completions[0]).to.contain.keys('name', 'type')
        expect(result.completions[0].name).to.eql('appendFile')
        callback()
      })
    })
  })
  
  describe('untitled', function () {
    it('without offset', function () {})
    it('with offset', function () {})
  })
})