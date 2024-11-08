# Request Redirector Chrome Extension

A Chrome extension that intercepts and redirects requests based on configurable filter rules.

## Background

When debugging web backend services locally, we often need to redirect frontend requests to local debug processes. This extension helps simplify this process by providing an easy way to manage request redirections.

## Features

- One-click enable/disable request redirection
- Configure filter rules to redirect matching requests
- Drag-and-drop interface to adjust filter rule priorities
- Track and display all redirected requests with their matching filters

## Filter Rules

### Supported Matching Methods
- Prefix matching
  - Rule example: `https://testtaskonbackend.taskon.xyz/` → `http://127.0.0.1:8080/`
  - Redirect example 1: `https://testtaskonbackend.taskon.xyz/boost/v1/submitBoostQuest` → `http://127.0.0.1:8080/boost/v1/submitBoostQuest`
  - Redirect example 2: `https://testtaskonbackend.taskon.xyz/v1/getUserInfo` → `http://127.0.0.1:8080/v1/getUserInfo`
- Wildcard matching (planned)
- Regular expression matching (planned)

Currently, only prefix matching and replacement are implemented.

## User Interface

The extension features a minimalist, hand-drawn style UI with two main pages:

### Popup Page (popup.html)
- Master switch for enabling/disabling redirects
- List of currently active filter rules
- Real-time redirect logs

### Options Page (options.html)
- Add/edit/delete filter rules
- Drag-and-drop interface for adjusting rule priorities
- Individual enable/disable switches for each rule
- Confirmation popup when deleting rules
- Disabled rules are shown in gray in the popup

## Technical Details

Built using Chrome Extension Manifest V3, utilizing the declarativeNetRequest API for request interception and redirection.
