# Notes

- Add an action when closing a discussion like:
    - The decision that has been made (Approved, rejected, Took in consideration)
    - When a thread is closed, write a markdown formatted message with:
        - Topic
        - Initial proposal
        - Summary of final proposal/decision
        - Participants
        - Final Status inline with timestamp
          The message will be posted in a specific channel. The thread will be archived and/or deleted.
- Change the status selection to a button list it'll make it easier to act onClick, based on the new status.
- Change the name of the thread based on the status, specifically when the status is deferred or closed.
- If possible make the GUILD_ID something the user has to specify
- If possible make the bot reusable in any forum channel, so find a way to dynamically give its id somewhere *If the
  guild id and the channel id are dynamic, it makes the bot usable in any server, any forum*
- Make the index file more readable with specific steps to achieve what we want:
    - Proper functions and methods name
    - More file maybe to put everything at its right place in order to avoid confusion
- Make the fetch operation like the ones used hibernate, I like the syntax
- 
