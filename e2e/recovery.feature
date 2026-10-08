Feature: Recover work and navigate accessibly
  Scenario: Conflicting drafts remain recoverable
    Given I open a fresh notebook
    When I create a note titled "Shared thought" with body "Original"
    And two tabs save different edits to the same note
    Then I can keep the conflicting draft as a separate note

  Scenario: Deleted notes can be undone and restored
    Given I open a fresh notebook
    When I create a note titled "Keep me" with body "Recoverable"
    And I delete "Keep me"
    Then deletion moves focus to main and Undo restores the note
    When I delete "Keep me"
    Then I can restore the note from Trash after reloading

  Scenario: Validation and navigation remain accessible
    Given I open a fresh notebook
    Then an empty title is explained and focused
    And note search survives a settings round trip
    And the Settings skip link preserves its route

  Scenario: Downloaded backups can be safely imported
    Given I open a fresh notebook
    When I create a note titled "Backup thought" with body "Portable"
    Then I can download and import my backup without replacing the original

  Scenario: Browser Back restores a populated list position
    Given I open a fresh notebook
    When I create a note titled "One" with body "First thought"
    And I create a note titled "Two" with body "Second thought"
    And I create a note titled "Three" with body "Third thought"
    And I create a note titled "Four" with body "Fourth thought"
    Then browser Back restores the scrolled notes after loading
