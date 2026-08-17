# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Adopted the shared `web-ui-kit` design system as this app's root frame: a themed layout shell with the app title and version, styled entirely with design tokens instead of ad-hoc CSS. If the design system fails to load, a clear error message is shown instead of a broken or blank page.
