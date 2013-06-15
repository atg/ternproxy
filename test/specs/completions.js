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
      sending_full_content: false,
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
    var filename = path.join(__dirname, '..', 'workspaces', '#0', 'node.js')
    var FILE = fs.readFileSync(filename, 'utf8')
    
    before(function (callback) {
      utils.query('/file/opened', {
        project_dir: project_dir,
        sending_full_content: true,
        project_id: 0,
        document_id: 0,
        FILE: FILE
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
        path: filename,
        FILE: FILE,
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
        sending_full_content: false,
        path: filename,
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
    
    it('with new offset', function (callback) {
      utils.query('/completions', {
        project_id: 0,
        document_id: 0,
        project_dir: project_dir,
        sending_full_content: false,
        path: filename,
        FILE: 'rea',
        delta_offset: 59,
        delta_length: 4, //SHOULDN'T THIS BE 3???
        cursor_position: 62
      }, function (e, result) {
        if(e) return callback(e)
        expect(result).to.contain.keys('completions')
        expect(result.completions.length).to.be.at.least(1)
        expect(result.completions[0]).to.contain.keys('name', 'type')
        expect(result.completions[0].name).to.eql('read')
        callback()
      })
    })
  })
  
  describe('untitled', function () {
    var filename = path.join(__dirname, '..', 'workspaces', '#0', 'ecma5.js')
    var FILE = fs.readFileSync(filename, 'utf8')
    
    before(function (callback) {
      utils.query('/file/opened', {
        project_dir: project_dir,
        project_id: 0,
        document_id: 1,
        sending_full_content: true,
        FILE: FILE
      }, callback)
    })
    
    after(function (callback) {
      utils.query('/file/closed', {
        project_dir: project_dir,
        project_id: 0,
        sending_full_content: false,
        document_id: 1
      }, callback)
    })
    
    it('without offset', function (callback) {
      utils.query('/completions', {
        project_id: 0,
        document_id: 0,
        project_dir: project_dir,
        path: filename,
        FILE: FILE,
        sending_full_content: true,
        cursor_position: 368
      }, function (e, result) {
        if(e) return callback(e)
        expect(result).to.contain.keys('completions')
        expect(result.completions.length).to.be.at.least(3)
        expect(result.completions[0]).to.contain.keys('name', 'type')
        expect(result.completions[0].name).to.eql('author')
        expect(result.completions[1].name).to.eql('title')
        expect(result.completions[2].name).to.eql('rent')
        callback()
      })
    })
    
    it('with offset', function (callback) {
      utils.query('/completions', {
        project_id: 0,
        document_id: 0,
        project_dir: project_dir,
        sending_full_content: false,
        path: filename,
        FILE: '\n\nBook.prototype.open = function () {\n  return \'\'\n}\n\nvar hp = new Book()\n\nhp.',
        delta_offset: 342,
        delta_length: 77,
        cursor_position: 419
      }, function (e, result) {
        if(e) return callback(e)
        expect(result).to.contain.keys('completions')
        expect(result.completions.length).to.be.at.least(4)
        expect(result.completions[0]).to.contain.keys('name', 'type')
        expect(result.completions[2].name).to.eql('open')
        callback()
      })
    })
    
    it('with new offset', function (callback) {
      utils.query('/completions', {
        project_id: 0,
        document_id: 0,
        project_dir: project_dir,
        sending_full_content: false,
        path: filename,
        FILE: 'op',
        delta_offset: 419,
        delta_length: 2,
        cursor_position: 421
      }, function (e, result) {
        if(e) return callback(e)
        expect(result).to.contain.keys('completions')
        expect(result.completions.length).to.be.at.least(1)
        expect(result.completions[0]).to.contain.keys('name', 'type')
        expect(result.completions[0].name).to.eql('open')
        callback()
      })
    })
  })
})