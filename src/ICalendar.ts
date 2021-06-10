import CalendarBase from './CalendarBase'
import { FORMAT } from './constants'
import data from './utils/data'
import ics from './utils/ics'
import time from './utils/time'
import CalendarOptions from './types/CalendarOptions'
import ICSAlarm from './types/ICSAlarm'
import ICSAttendeeOptions from './types/ICSAttendeeOptions'
import ICSDuration from './types/ICSDuration'
import ICSPropertyValue from './types/ICSPropertyValue'

/**
 * Generates a downloadable ICS file.
 */
export default class ICalendar extends CalendarBase {
  /** List of additional ICalendar events to add. */
  private additionalEvents: ICalendar[] = []

  /** List of VEVENT property-value entries */
  private properties: string[] = []

  /** Key-value pair of basic calendar properties. */
  private meta: Record<string, string> = {}

  constructor (opts: CalendarOptions) {
    super(opts)
    this.setInitialParams()
  }

  /**
   * Sets the basic properties for the calendar instance.
   */
  protected setInitialParams = (): void => {
    this
      .setMeta('UID', ics.getUid())
      .setMeta('DTSTAMP', time.getTimeCreated())
      .setMeta('PRODID', ics.getProdId())
      .addProperty('CLASS', 'PUBLIC')
      .addProperty('DESCRIPTION', ics.formatText(this.description))
      .addProperty('LOCATION', ics.formatText(this.location))
      .addProperty('SUMMARY', ics.formatText(this.title))
      .addProperty('TRANSP', 'TRANSPARENT')

    if (this.isAllDay) {
      // for all-day events, omit the time and just place dates
      this
        .addProperty('DTSTART;VALUE=DATE', time.formatDate(this.start, FORMAT.DATE))
        .addProperty('DTEND;VALUE=DATE', time.formatDate(this.end, FORMAT.DATE))
    } else {
      // otherwise, set the full start and end dates
      this
        .addProperty('DTSTART', time.formatDate(this.start, FORMAT.FULL))
        .addProperty('DTEND', time.formatDate(this.end, FORMAT.FULL))
    }

    if (this.recurrence) {
      this.addProperty('RRULE', ics.getRrule(this.recurrence))
    }

    if (this.attendees.length > 0) {
      this
        .attendees
        .forEach(({ email, name, icsOptions = {} }) => {
          const params = this.getAttendeeParams(icsOptions, name)
          const mailto = `MAILTO:${email}`

          this.addProperty(params, mailto)
        })
    }
  }

  /**
   * Generates the ATTENDEE property param based on user-specified options and the attendee name.
   *
   * @param {ICSAttendeeOptions} options
   * @param {string} name
   * @returns {string}
   */
  private getAttendeeParams = (options: ICSAttendeeOptions, name?: string): string => {
    const params: Record<string, string> = {}

    if (name) params['CN'] = name
    if (options.delegatedFrom) params['DELEGATED-FROM'] = options.delegatedFrom
    if (options.partStat) params['PARTSTAT'] = options.partStat
    if (options.role) params['ROLE'] = options.role
    if (options.sentBy) params['SENT-BY'] = options.sentBy

    params['RSVP'] = options.rsvp ? 'TRUE' : 'FALSE'

    const paramString = data.toParamString(params, ';')

    return `ATTENDEE;${paramString}`
  }

  /**
   * Generates a valid ICS alarm duration.
   *
   * @example getAlarmDuration({ minutes: 3, seconds: 2 }) -> PT3M2S
   * @param {ICSDuration} duration
   * @returns {string}
   */
  private getAlarmDuration = (duration: ICSDuration): string => {
    const features = [
      `${duration.weeks}W`,
      `${duration.days}D`,
      `${duration.hours}H`,
      `${duration.minutes}M`,
      `${duration.seconds}S`
    ].filter((s: string) => /^[0-9]+[A-Z]$/.exec(s)) // exclude zero-duration features

    features.unshift(duration.after ? 'PT' : '-PT')

    return features.join('')
  }

  /**
   * Sets iCalendar meta properties, such as UID, DTSTAMP, etc.
   *
   * @param {string} key
   * @param {string} value
   * @returns {ICalendar}
   */
  public setMeta = (key: string, value: string): this => {
    this.meta[key] = value

    return this
  }

  /**
   * Adds the given event to the same `.ics` file instance.
   *
   * @param {ICalendar} event
   * @returns {ICalendar}
   */
  public addEvent = (event: ICalendar): this => {
    this.additionalEvents.push(event)

    return this
  }

  /**
   * Adds any additional desired iCalendar property having the given key-value pair to the instance.
   *
   * @param {Alarm} alarm
   * @returns {ICalendar}
   */
  public addProperty = (key: string, value: ICSPropertyValue): this => {
    if (typeof value === 'object') {
      this.properties.push(`BEGIN:${key}`)

        for (const k in value) {
          this.addProperty(k, value[k])
        }

        this.properties.push(`END:${key}`)
    } else {
      this.properties.push(`${key}:${value.toString()}`)
    }

    return this
  }

  /**
   * Adds an alarm. Multiple different alarms may be added to a single instance.
   *
   * @param {Alarm} alarm
   * @returns {ICalendar}
   */
  public addAlarm = (alarm: ICSAlarm): this => {
    const value: ICSPropertyValue = {
      ACTION: alarm.action
    }

    if (alarm.description) value.DESCRIPTION = ics.formatText(alarm.description)
    if (alarm.summary) value.SUMMARY = ics.formatText(alarm.summary)
    if (alarm.duration) value.DURATION = this.getAlarmDuration(alarm.duration)
    if (alarm.repeat) value.REPEAT = alarm.repeat
    if (alarm.attach) {
      const key = alarm.attach.params
        ? `ATTACH;${alarm.attach.params}`
        : 'ATTACH'

      value[key] = alarm.attach.url
    }
    if (alarm.trigger instanceof Date) {
      value['TRIGGER;VALUE=DATE-TIME'] = time.formatDate(alarm.trigger, FORMAT.FULL)
    } else {
      value['TRIGGER'] = this.getAlarmDuration(alarm.trigger)
    }

    return this.addProperty('VALARM', value)
  }

  /**
   * Downloads the rendered iCalendar.
   *
   * @remark Only works in browsers.
   *
   * @param {string} fileName optional explicit file name, if not provided then will be constructed from title
   */
  public download = (fileName?: string): void => {
    ics.download(fileName || ics.getFileName(this.title), this.render())
  }

  /**
   * Generates the iCalendar data.
   *
   * @returns {string}
   */
  public render = (): string => {
    const vEvents: string[] = this
      .additionalEvents
      .concat(this)
      .reduce((properties: string[], calendar: ICalendar) => [
        ...properties,
        'BEGIN:VEVENT',
        ...calendar.properties,
        'END:VEVENT'
      ], [])

    const meta: string[] = Object
      .keys(this.meta)
      .map((key: string) => {
        return `${key}:${this.meta[key]}`
      })

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      ...vEvents,
      'END:VCALENDAR',
      ...meta
    ].join('\n')
  }
}
