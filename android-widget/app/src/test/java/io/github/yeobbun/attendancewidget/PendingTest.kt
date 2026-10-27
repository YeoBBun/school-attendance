package io.github.yeobbun.attendancewidget

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import java.net.InetAddress
import java.net.ServerSocket
import java.util.Base64

/** pending-fixture.json 은 출결 앱의 encrypt() 로 '시험용 비밀번호' 를 써서 잠근 것이다. */
class PendingTest {
    private val fixture = javaClass.getResource("/pending-fixture.json")!!.readText()

    @Test
    fun `출결 앱이 잠근 요약을 푼다`() {
        val s = Pending.parse(Pending.decrypt(fixture, "시험용 비밀번호"))
        assertEquals("2-3", s.className)
        assertEquals(listOf("결석계", "체험학습 보고서", "체험학습 신청서"), s.items.map { it.doc })
        assertEquals("3. 김하늘", s.items[0].who)
        assertEquals(null, s.items[0].deadline)
        assertEquals("2026-10-23", s.items[1].tripEnd)
    }

    @Test
    fun `비밀번호가 다르면 알려준다`() {
        val e = assertThrows(WidgetError::class.java) { Pending.decrypt(fixture, "틀림") }
        assertEquals("잠금 비밀번호가 출결 앱과 달라요.", e.message)
    }

    @Test
    fun `기한 지난 것을 위로, 다녀오기 전 보고서는 표시`() {
        val s = Pending.parse(Pending.decrypt(fixture, "시험용 비밀번호"))
        val sorted = s.sorted("2026-10-30")
        assertEquals("체험학습 신청서", sorted[0].doc)
        assertEquals("10/22(목) 체험학습 · 기한 10/30", s.items[1].detail("2026-10-30"))
        assertEquals("10/22(목) 체험학습 · 다녀온 후 · 기한 10/30", s.items[1].detail("2026-10-22"))
    }

    @Test
    fun `깃허브에서 받고, sha 가 같으면 건너뛴다`() {
        // 깃허브는 base64 를 60자마다 줄바꿈해서 준다
        val b64 = Base64.getMimeEncoder(60, "\n".toByteArray()).encodeToString(fixture.toByteArray())
        val body = """{"sha":"abc","content":"${b64.replace("\n", "\\n")}"}""".toByteArray()
        val requests = mutableListOf<List<String>>()
        // 안드로이드 단위 시험에는 com.sun.net.httpserver 가 없어 소켓으로 직접 답한다
        val server = ServerSocket(0, 0, InetAddress.getLoopbackAddress())
        val thread = Thread {
            repeat(2) {
                server.accept().use { sock ->
                    val reader = sock.getInputStream().bufferedReader()
                    requests += generateSequence { reader.readLine()?.takeIf { it.isNotEmpty() } }.toList()
                    val out = sock.getOutputStream()
                    out.write("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ${body.size}\r\nConnection: close\r\n\r\n".toByteArray())
                    out.write(body)
                    out.flush()
                }
            }
        }.apply { start() }
        try {
            GitHub.api = "http://127.0.0.1:${server.localPort}"
            val f = GitHub.fetchPending("me/sync", "tok", null)!!
            assertEquals("GET /repos/me/sync/contents/sync/pending.json HTTP/1.1", requests[0][0])
            assertTrue(requests[0].contains("Authorization: Bearer tok"))
            assertEquals("abc", f.sha)
            assertEquals(fixture, f.text)
            assertNull(GitHub.fetchPending("me/sync", "tok", "abc"))
        } finally {
            thread.join(5_000)
            server.close()
        }
    }
}
