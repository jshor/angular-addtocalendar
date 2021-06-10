import CalendarBase from '../CalendarBase'
import ICalendar from '../ICalendar'
import CalendarOptions from '../types/CalendarOptions'
import ics from '../utils/ics'
import time  from '../utils/time'
import { FORMAT } from '../constants'
import ICSAlarm from '../types/ICSAlarm'
import CalendarAttendee from '../types/CalendarAttendee'

describe('ICalendar', () => {
  const baseOpts: CalendarOptions = {
    title: 'Fun Party',
    description: 'BYOB',
    location: 'New York',
    start: new Date('2019-07-04T19:00:00.000'),
    end: new Date('2019-07-04T21:00:00.000')
  }

  afterEach(() => jest.resetAllMocks())

  it('should be a subclass of CalendarBase', () => {
    const result = new ICalendar(baseOpts)

    expect(result).toBeInstanceOf(CalendarBase)
  })

  it('should render just the date for an all-day event', () => {
    const obj = new ICalendar({
      title: 'Fun Party',
      description: 'BYOB',
      location: 'New York',
      start: new Date('2019-07-04T19:00:00.000')
    })

    expect(obj.render()).toContain([
      `DTSTART;VALUE=DATE:${time.formatDate(baseOpts.start, FORMAT.DATE)}`,
      `DTEND;VALUE=DATE:${time.formatDate(baseOpts.end, FORMAT.DATE)}`
    ].join('\n'))
  })

  describe('addAlarm()', () => {
    let obj: ICalendar

    beforeEach(() => {
      obj = new ICalendar(baseOpts)
    })

    it('should add a one-hour-long `PROCEDURE` alarm with the given date, repeating 23 times, with an application attached', () => {
      const alarm: ICSAlarm = {
        action: 'PROCEDURE',
        trigger: new Date('1998-01-01T05:00:00Z'),
        repeat: 23,
        duration: {
          after: true,
          hours: 1
        },
        attach: {
          params: 'FMTTYPE=application/binary',
          url: 'ftp://host.com/novo-procs/felizano.exe'
        }
      }

      obj.addAlarm(alarm)

      expect(obj.render()).toContain([
        'BEGIN:VALARM',
        'ACTION:PROCEDURE',
        'DURATION:PT1H',
        'REPEAT:23',
        'ATTACH;FMTTYPE=application/binary:ftp://host.com/novo-procs/felizano.exe',
        'TRIGGER;VALUE=DATE-TIME:19980101T050000Z',
        'END:VALARM'
      ].join('\n'))
    })

    it('should add a `DISPLAY` alarm with an email CID set as the attachment', () => {
      const alarm: ICSAlarm = {
        action: 'DISPLAY',
        trigger: new Date('1998-01-01T05:00:00Z'),
        attach: {
          url: 'CID:john.doe@example.com'
        }
      }

      obj.addAlarm(alarm)

      expect(obj.render()).toContain([
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'ATTACH:CID:john.doe@example.com',
        'TRIGGER;VALUE=DATE-TIME:19980101T050000Z',
        'END:VALARM'
      ].join('\n'))
    })

    it('should add a three-minute-long `DISPLAY` alarm with the given description and summary', () => {
      const alarm: ICSAlarm = {
        action: 'DISPLAY',
        trigger: new Date('1998-01-01T05:00:00Z'),
        description: 'the event description',
        summary: 'a quick summary',
        duration: {
          after: true,
          minutes: 3
        }
      }

      obj.addAlarm(alarm)

      expect(obj.render()).toContain([
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'DESCRIPTION:the event description',
        'SUMMARY:a quick summary',
        'DURATION:PT3M',
        'TRIGGER;VALUE=DATE-TIME:19980101T050000Z',
        'END:VALARM'
      ].join('\n'))
    })

    it('should trigger an alarm five minutes before the event', () => {
      const alarm: ICSAlarm = {
        action: 'DISPLAY',
        trigger: {
          minutes: 5
        }
      }

      obj.addAlarm(alarm)

      expect(obj.render()).toContain([
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'TRIGGER:-PT5M',
        'END:VALARM'
      ].join('\n'))
    })

    it('should trigger an alarm five minutes before the event', () => {
      const alarm: ICSAlarm = {
        action: 'DISPLAY',
        trigger: {
          minutes: 5
        }
      }

      obj.addAlarm(alarm)

      expect(obj.render()).toContain([
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'TRIGGER:-PT5M',
        'END:VALARM'
      ].join('\n'))
    })
  })

  describe('download()', () => {
    it('should call render and the download util', () => {
      const obj = new ICalendar(baseOpts)
      const mockRender = 'renderedstring'

      jest
        .spyOn(ics, 'download')
        .mockImplementation(jest.fn())
      jest
        .spyOn(obj, 'render')
        .mockReturnValue(mockRender)

      obj.download()

      expect(obj.render).toHaveBeenCalledTimes(1)
      expect(ics.download).toHaveBeenCalledTimes(1)
      expect(ics.download).toHaveBeenCalledWith(`${baseOpts.title}.ics`, mockRender)
    })
  })

  describe('download(filename)', () => {
    it('should call render and the download util with provided filename', () => {
      const obj = new ICalendar(baseOpts)
      const mockRender = 'renderedstring'

      jest
        .spyOn(ics, 'download')
        .mockImplementation(jest.fn())
      jest
        .spyOn(obj, 'render')
        .mockReturnValue(mockRender)

      obj.download('test.ics')

      expect(obj.render).toHaveBeenCalledTimes(1)
      expect(ics.download).toHaveBeenCalledTimes(1)
      expect(ics.download).toHaveBeenCalledWith('test.ics', mockRender)
    })
  })

  describe('render()', () => {
    const mockUuid = 'mock-uuid-1234'

    beforeEach(() => {
      jest
        .spyOn(ics, 'formatText')
        .mockImplementation(s => s || '')
      jest
        .spyOn(ics, 'getUid')
        .mockReturnValue(mockUuid)
      jest
        .spyOn(ics, 'getProdId')
        .mockReturnValue('foobar')
    })

    afterEach(() => {
      Object.defineProperty(global, 'window', {
        writable: true
      })
    })

    it('should format the description, location, and title with the sanitize function', () => {
      const obj = new ICalendar(baseOpts)

      obj.render()

      expect(ics.formatText).toHaveBeenCalledTimes(3)
      expect(ics.formatText).toHaveBeenCalledWith(baseOpts.description)
      expect(ics.formatText).toHaveBeenCalledWith(baseOpts.location)
      expect(ics.formatText).toHaveBeenCalledWith(baseOpts.title)
    })

    it('should contain the RRULE parameter if a recurrence was specified', () => {
      const obj = new ICalendar({
        ...baseOpts,
        recurrence: {
          frequency: 'WEEKLY',
          interval: 2
        }
      })

      expect(obj.render()).toContain('RRULE:')
    })

    it('should call getUid', () => {
      const obj = new ICalendar(baseOpts)

      obj.render()

      expect(ics.getUid).toHaveBeenCalledTimes(1)
    })

    it('should render ICS file content string for a single event', () => {
      const obj = new ICalendar(baseOpts)
      const rendered = obj.render()
      const expected = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'BEGIN:VEVENT',
        'CLASS:PUBLIC',
        `DESCRIPTION:${baseOpts.description}`,
        `LOCATION:${baseOpts.location}`,
        `SUMMARY:${baseOpts.title}`,
        'TRANSP:TRANSPARENT',
        `DTSTART:${time.formatDate(baseOpts.start, FORMAT.FULL)}`,
        `DTEND:${time.formatDate(baseOpts.end, FORMAT.FULL)}`,
        'END:VEVENT',
        'END:VCALENDAR',
        `UID:${mockUuid}`,
        `DTSTAMP:${time.getTimeCreated()}`,
        'PRODID:foobar'
      ].join('\n')

      expect(rendered).toBe(expected)
    })

    it('should render multiple VEVENT entries for additional events', () => {
      const secondEventOpts: CalendarOptions = {
        title: 'Monthly Meeting with Boss Man',
        location: 'Conference Room 2A, Big Company, Brooklyn, NY',
        description: 'Meeting to discuss weekly things',
        start: new Date('2022-07-08T19:00:00'),
        end: new Date('2019-07-04T21:00:00.000')
      }

      const obj = new ICalendar(baseOpts)
      const secondEvent = new ICalendar(secondEventOpts)

      const rendered = obj
        .addEvent(secondEvent)
        .render()

      const expected = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',

        // second event
        'BEGIN:VEVENT',
        'CLASS:PUBLIC',
        `DESCRIPTION:${secondEventOpts.description}`,
        `LOCATION:${secondEventOpts.location}`,
        `SUMMARY:${secondEventOpts.title}`,
        'TRANSP:TRANSPARENT',
        `DTSTART:${time.formatDate(secondEventOpts.start, FORMAT.FULL)}`,
        `DTEND:${time.formatDate(baseOpts.end, FORMAT.FULL)}`,
        'END:VEVENT',

        // base event
        'BEGIN:VEVENT',
        'CLASS:PUBLIC',
        `DESCRIPTION:${baseOpts.description}`,
        `LOCATION:${baseOpts.location}`,
        `SUMMARY:${baseOpts.title}`,
        'TRANSP:TRANSPARENT',
        `DTSTART:${time.formatDate(baseOpts.start, FORMAT.FULL)}`,
        `DTEND:${time.formatDate(baseOpts.end, FORMAT.FULL)}`,
        'END:VEVENT',

        'END:VCALENDAR',
        `UID:${mockUuid}`,
        `DTSTAMP:${time.getTimeCreated()}`,
        'PRODID:foobar'
      ].join('\n')

      expect(rendered).toBe(expected)
    })

    describe('with attendees', () => {
      const configWithAttendees = (attendees: CalendarAttendee[]): CalendarOptions => ({
        title: 'Monthly Meeting with Boss Man',
        location: 'Conference Room 2A, Big Company, Brooklyn, NY',
        description: 'Meeting to discuss weekly things',
        start: new Date('2022-07-08T19:00:00'),
        end: new Date('2019-07-04T21:00:00.000'),
        attendees
      })

      it('should render an attendee with the common name present', () => {
        const eventOpts = configWithAttendees([
          {
            name: 'John Doe',
            email: 'john@doe.com',
            icsOptions: {
              sentBy: 'MAILTO:boss@company.com'
            }
          }
        ])

        const obj = new ICalendar(eventOpts)
        const rendered = obj.render()

        expect(rendered).toContain('ATTENDEE;CN=John Doe;SENT-BY=MAILTO:boss@company.com;RSVP=FALSE:MAILTO:john@doe.com')
      })

      it('should render an attendee with a quoted `DELEGATED-FROM` param', () => {
        const eventOpts = configWithAttendees([
          {
            email: 'john@doe.com',
            icsOptions: {
              delegatedFrom: 'MAILTO:boss@company.com'
            }
          }
        ])

        const obj = new ICalendar(eventOpts)
        const rendered = obj.render()

        expect(rendered).toContain('ATTENDEE;DELEGATED-FROM=MAILTO:boss@company.com;RSVP=FALSE:MAILTO:john@doe.com')
      })

      it('should render an attendee with a quoted `PARTSTAT` param', () => {
        const eventOpts = configWithAttendees([
          {
            email: 'john@doe.com',
            icsOptions: {
              partStat: 'ACCEPTED'
            }
          }
        ])

        const obj = new ICalendar(eventOpts)
        const rendered = obj.render()

        expect(rendered).toContain('ATTENDEE;PARTSTAT=ACCEPTED;RSVP=FALSE:MAILTO:john@doe.com')
      })

      it('should render an attendee with a quoted `ROLE` param', () => {
        const eventOpts = configWithAttendees([
          {
            email: 'john@doe.com',
            icsOptions: {
              role: 'REQ-PARTICIPANT'
            }
          }
        ])

        const obj = new ICalendar(eventOpts)
        const rendered = obj.render()

        expect(rendered).toContain('ATTENDEE;ROLE=REQ-PARTICIPANT;RSVP=FALSE:MAILTO:john@doe.com')
      })

      it('should render a non-RSVP\'d attendee', () => {
        const eventOpts = configWithAttendees([
          {
            email: 'john@doe.com'
          }
        ])

        const obj = new ICalendar(eventOpts)
        const rendered = obj.render()

        expect(rendered).toContain('ATTENDEE;RSVP=FALSE:MAILTO:john@doe.com')
      })

      it('should render an RSVP\'d attendee', () => {
        const eventOpts = configWithAttendees([
          {
            email: 'john@doe.com',
            icsOptions: {
              rsvp: true
            }
          }
        ])

        const obj = new ICalendar(eventOpts)
        const rendered = obj.render()

        expect(rendered).toContain('ATTENDEE;RSVP=TRUE:MAILTO:john@doe.com')
      })

      it('should render an attendee with a quoted `SENT-BY` param', () => {
        const eventOpts = configWithAttendees([
          {
            email: 'john@doe.com',
            icsOptions: {
              sentBy: 'MAILTO:boss@company.com'
            }
          }
        ])

        const obj = new ICalendar(eventOpts)
        const rendered = obj.render()

        expect(rendered).toContain('ATTENDEE;SENT-BY=MAILTO:boss@company.com;RSVP=FALSE:MAILTO:john@doe.com')
      })

      it('should render multiple attendees', () => {
        const eventOpts = configWithAttendees([
          { email: 'john@doe.com' },
          { email: 'jane@doe.com' }
        ])

        const obj = new ICalendar(eventOpts)
        const rendered = obj.render()

        expect(rendered).toContain('ATTENDEE;RSVP=FALSE:MAILTO:john@doe.com')
        expect(rendered).toContain('ATTENDEE;RSVP=FALSE:MAILTO:jane@doe.com')
      })
    })
  })
})
