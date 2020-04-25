import { Machine, assign } from 'xstate'
import { useMachine } from '@xstate/react'
import useSWR from 'swr'

const timeTableMachine = Machine(
  {
    id: 'timeTable',
    initial: 'selectJob',
    context: {
      selectedJob: null,
      selectedClass: null,
    },
    states: {
      selectJob: {},
      selectClass: {
        on: {
          CLASS_SELECTED: {
            target: 'showTimeTable',
            actions: 'classSelected',
          },
        },
      },
      showTimeTable: {
        on: {
          CLASS_SELECTED: {
            target: 'showTimeTable',
            actions: 'classSelected',
          },
        },
      },
    },
    on: {
      JOB_SELECTED: {
        target: 'selectClass',
        actions: 'jobSelected',
      },
    },
  },
  {
    actions: {
      jobSelected: assign((_ctx, e) => ({
        selectedJob: e.value,
        selectedClass: null,
      })),
      classSelected: assign((ctx, e) => ({
        ...ctx,
        selectedClass: e.value,
      })),
    },
  }
)

const jobFetcher = () => {
  return fetch('https://sandbox.gibm.ch/berufe.php')
    .then((res) => res.json())
    .then((jobs) => {
      return jobs.filter((el) => el.beruf_name !== '1')
    })
}
const classFetcher = (_key, jobId) => {
  return fetch(
    `https://sandbox.gibm.ch/klassen.php?beruf_id=${jobId}`
  ).then((res) => res.json())
}

const timeTableFetcher = (_key, classId) => {
  return fetch(
    `https://sandbox.gibm.ch/tafel.php?klasse_id=${classId}`
  ).then((res) => res.json())
}

export default () => {
  const [state, send] = useMachine(timeTableMachine)
  const { selectedJob, selectedClass } = state.context

  const { data: jobData } = useSWR('jobs', jobFetcher, {
    revalidateOnFocus: false,
  })

  const { data: classData } = useSWR(
    selectedJob ? ['classesFor', selectedJob] : null,
    classFetcher
  )

  const { data: timeTableData } = useSWR(
    selectedJob ? ['timeTableFor', selectedClass] : null,
    timeTableFetcher
  )

  const handelJobSelect = (e) => {
    send({ type: 'JOB_SELECTED', value: e.target.value })
  }
  const handelClassSelect = (e) => {
    send({ type: 'CLASS_SELECTED', value: e.target.value })
  }

  return (
    <>
      <p>{state.value}</p>
      <div>
        <select onChange={handelJobSelect}>
          {jobData &&
            jobData.map((job) => (
              <option key={job.beruf_id} value={job.beruf_id}>
                {job.beruf_name}
              </option>
            ))}
        </select>
      </div>
      <div>
        {!state.matches('selectJob') && (
          <select onChange={handelClassSelect}>
            {classData &&
              classData.map((schoolClass) => (
                <option
                  key={schoolClass.klasse_id}
                  value={schoolClass.klasse_id}
                >
                  {schoolClass.klasse_name}
                </option>
              ))}
          </select>
        )}
      </div>
      <div>
        {state.matches('showTimeTable') && (
          <ul>
            {timeTableData &&
              timeTableData.map((tafel) => (
                <li key={tafel.tafel_id}>{tafel.tafel_longfach}</li>
              ))}
          </ul>
        )}
      </div>
    </>
  )
}
